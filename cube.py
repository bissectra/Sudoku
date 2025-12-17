from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Tuple, List, ClassVar


# ======================
# Geometry
# ======================

class Direction(Enum):
    UP = 0
    RIGHT = 1
    DOWN = 2
    LEFT = 3

    @property
    def delta(self) -> Tuple[int, int]:
        return {
            Direction.UP: (0, -1),
            Direction.DOWN: (0, 1),
            Direction.LEFT: (-1, 0),
            Direction.RIGHT: (1, 0),
        }[self]


class Orientation(Enum):
    TOP = 0
    NORTH = 1
    EAST = 2
    BOTTOM = 3
    SOUTH = 4
    WEST = 5

    @property
    def op(self) -> Orientation:
        return Orientation((self.value + 3) % 6)


class Face(Enum):
    X_POS = 0
    X_NEG = 1
    Y_POS = 2
    Y_NEG = 3
    Z_POS = 4
    Z_NEG = 5


# ======================
# Right-handed frame map
# ======================
# Z = X × Y
# Only defined for orthogonal pairs
# Guaranteed right-handed

_Z_FROM_XY: Dict[Tuple[Orientation, Orientation], Orientation] = {
    # X = EAST
    (Orientation.EAST, Orientation.NORTH): Orientation.TOP,
    (Orientation.EAST, Orientation.SOUTH): Orientation.BOTTOM,
    (Orientation.EAST, Orientation.TOP): Orientation.SOUTH,
    (Orientation.EAST, Orientation.BOTTOM): Orientation.NORTH,

    # X = WEST
    (Orientation.WEST, Orientation.NORTH): Orientation.BOTTOM,
    (Orientation.WEST, Orientation.SOUTH): Orientation.TOP,
    (Orientation.WEST, Orientation.TOP): Orientation.NORTH,
    (Orientation.WEST, Orientation.BOTTOM): Orientation.SOUTH,

    # X = NORTH
    (Orientation.NORTH, Orientation.EAST): Orientation.BOTTOM,
    (Orientation.NORTH, Orientation.WEST): Orientation.TOP,
    (Orientation.NORTH, Orientation.TOP): Orientation.EAST,
    (Orientation.NORTH, Orientation.BOTTOM): Orientation.WEST,

    # X = SOUTH
    (Orientation.SOUTH, Orientation.EAST): Orientation.TOP,
    (Orientation.SOUTH, Orientation.WEST): Orientation.BOTTOM,
    (Orientation.SOUTH, Orientation.TOP): Orientation.WEST,
    (Orientation.SOUTH, Orientation.BOTTOM): Orientation.EAST,

    # X = TOP
    (Orientation.TOP, Orientation.EAST): Orientation.NORTH,
    (Orientation.TOP, Orientation.WEST): Orientation.SOUTH,
    (Orientation.TOP, Orientation.NORTH): Orientation.WEST,
    (Orientation.TOP, Orientation.SOUTH): Orientation.EAST,

    # X = BOTTOM
    (Orientation.BOTTOM, Orientation.EAST): Orientation.SOUTH,
    (Orientation.BOTTOM, Orientation.WEST): Orientation.NORTH,
    (Orientation.BOTTOM, Orientation.NORTH): Orientation.EAST,
    (Orientation.BOTTOM, Orientation.SOUTH): Orientation.WEST,
}


# ======================
# Cube
# ======================

@dataclass(frozen=True)
class Cube:
    """
    Cube orientation represented by (x, y).
    z is derived via a fixed right-handed lookup table.
    No runtime validation: correctness is by construction.
    """
    x: Orientation
    y: Orientation

    _ROLL_TABLE: ClassVar[Dict[Direction, Dict[Orientation, Orientation]]] = {
        Direction.UP: {
            Orientation.TOP: Orientation.NORTH,
            Orientation.NORTH: Orientation.BOTTOM,
            Orientation.BOTTOM: Orientation.SOUTH,
            Orientation.SOUTH: Orientation.TOP,
        },
        Direction.DOWN: {
            Orientation.TOP: Orientation.SOUTH,
            Orientation.SOUTH: Orientation.BOTTOM,
            Orientation.BOTTOM: Orientation.NORTH,
            Orientation.NORTH: Orientation.TOP,
        },
        Direction.RIGHT: {
            Orientation.TOP: Orientation.EAST,
            Orientation.EAST: Orientation.BOTTOM,
            Orientation.BOTTOM: Orientation.WEST,
            Orientation.WEST: Orientation.TOP,
        },
        Direction.LEFT: {
            Orientation.TOP: Orientation.WEST,
            Orientation.WEST: Orientation.BOTTOM,
            Orientation.BOTTOM: Orientation.EAST,
            Orientation.EAST: Orientation.TOP,
        },
    }

    # ---------- derived axis ----------

    @property
    def z(self) -> Orientation:
        return _Z_FROM_XY[(self.x, self.y)]

    # ---------- faces ----------

    def face(self, target: Orientation) -> Face:
        mapping = {
            self.x: Face.X_POS,
            self.x.op: Face.X_NEG,
            self.y: Face.Y_POS,
            self.y.op: Face.Y_NEG,
            self.z: Face.Z_POS,
            self.z.op: Face.Z_NEG,
        }
        return mapping[target]

    # ---------- rolling ----------

    def roll(self, direction: Direction) -> Cube:
        table = self._ROLL_TABLE[direction]

        def rot(o: Orientation) -> Orientation:
            return table.get(o, o)

        return Cube(
            x=rot(self.x),
            y=rot(self.y),
        )

    # ---------- encoding ----------

    def encode(self) -> int:
        return ALL_CUBES.index(self)

    @staticmethod
    def decode(i: int) -> Cube:
        return ALL_CUBES[i]

    # ---------- validation ----------

    def __post_init__(self):
        if (self.x, self.y) not in _Z_FROM_XY:
            raise ValueError(f"Invalid orientation combination: ({self.x}, {self.y})")


# ======================
# Canonical cube list
# ======================

def all_cubes() -> List[Cube]:
    cubes: List[Cube] = []
    for (x, y), _ in _Z_FROM_XY.items():
        cubes.append(Cube(x, y))
    return cubes


ALL_CUBES: List[Cube] = all_cubes()
assert len(ALL_CUBES) == 24