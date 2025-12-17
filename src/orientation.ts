import { DiceRotation } from "./types";

export const DICE_ROTATIONS: DiceRotation[] = ["left", "up", "right", "down"];

export enum Orientation {
  TOP = "TOP",
  NORTH = "NORTH",
  EAST = "EAST",
  BOTTOM = "BOTTOM",
  SOUTH = "SOUTH",
  WEST = "WEST",
}

export const ORIENTATION_OPPOSITE: Record<Orientation, Orientation> = {
  [Orientation.TOP]: Orientation.BOTTOM,
  [Orientation.BOTTOM]: Orientation.TOP,
  [Orientation.NORTH]: Orientation.SOUTH,
  [Orientation.SOUTH]: Orientation.NORTH,
  [Orientation.EAST]: Orientation.WEST,
  [Orientation.WEST]: Orientation.EAST,
};

export type DiceFaceDefinition = {
  orientation: Orientation;
  normal: [number, number, number];
  value: number;
};

export const DICE_FACE_DEFINITIONS: DiceFaceDefinition[] = [
  { orientation: Orientation.TOP, normal: [0, 0, 1], value: 1 },
  { orientation: Orientation.NORTH, normal: [0, 1, 0], value: 2 },
  { orientation: Orientation.EAST, normal: [1, 0, 0], value: 3 },
  { orientation: Orientation.WEST, normal: [-1, 0, 0], value: 4 },
  { orientation: Orientation.SOUTH, normal: [0, -1, 0], value: 5 },
  { orientation: Orientation.BOTTOM, normal: [0, 0, -1], value: 6 },
];

export const DICE_DIGITS = [1, 2, 3, 4, 5, 6] as const;

export const DICE_FACE_ORIENTATION_BY_VALUE: Record<number, Orientation> =
  DICE_FACE_DEFINITIONS.reduce<Record<number, Orientation>>((acc, face) => {
    acc[face.value] = face.orientation;
    return acc;
  }, {} as Record<number, Orientation>);

const XY_ORIENTATIONS: Array<[Orientation, Orientation, Orientation]> = [
  [Orientation.EAST, Orientation.NORTH, Orientation.TOP],
  [Orientation.EAST, Orientation.SOUTH, Orientation.BOTTOM],
  [Orientation.EAST, Orientation.TOP, Orientation.SOUTH],
  [Orientation.EAST, Orientation.BOTTOM, Orientation.NORTH],
  [Orientation.WEST, Orientation.NORTH, Orientation.BOTTOM],
  [Orientation.WEST, Orientation.SOUTH, Orientation.TOP],
  [Orientation.WEST, Orientation.TOP, Orientation.NORTH],
  [Orientation.WEST, Orientation.BOTTOM, Orientation.SOUTH],
  [Orientation.NORTH, Orientation.EAST, Orientation.BOTTOM],
  [Orientation.NORTH, Orientation.WEST, Orientation.TOP],
  [Orientation.NORTH, Orientation.TOP, Orientation.EAST],
  [Orientation.NORTH, Orientation.BOTTOM, Orientation.WEST],
  [Orientation.SOUTH, Orientation.EAST, Orientation.TOP],
  [Orientation.SOUTH, Orientation.WEST, Orientation.BOTTOM],
  [Orientation.SOUTH, Orientation.TOP, Orientation.WEST],
  [Orientation.SOUTH, Orientation.BOTTOM, Orientation.EAST],
  [Orientation.TOP, Orientation.EAST, Orientation.NORTH],
  [Orientation.TOP, Orientation.WEST, Orientation.SOUTH],
  [Orientation.TOP, Orientation.NORTH, Orientation.WEST],
  [Orientation.TOP, Orientation.SOUTH, Orientation.EAST],
  [Orientation.BOTTOM, Orientation.EAST, Orientation.SOUTH],
  [Orientation.BOTTOM, Orientation.WEST, Orientation.NORTH],
  [Orientation.BOTTOM, Orientation.NORTH, Orientation.EAST],
  [Orientation.BOTTOM, Orientation.SOUTH, Orientation.WEST],
];

const XY_KEY = (x: Orientation, y: Orientation): string => `${x}|${y}`;

const Z_FROM_XY = new Map<string, Orientation>();
XY_ORIENTATIONS.forEach(([x, y, z]) => {
  Z_FROM_XY.set(XY_KEY(x, y), z);
});

const ROLL_TABLE: Record<DiceRotation, Partial<Record<Orientation, Orientation>>> = {
  up: {
    [Orientation.TOP]: Orientation.NORTH,
    [Orientation.NORTH]: Orientation.BOTTOM,
    [Orientation.BOTTOM]: Orientation.SOUTH,
    [Orientation.SOUTH]: Orientation.TOP,
  },
  down: {
    [Orientation.TOP]: Orientation.SOUTH,
    [Orientation.SOUTH]: Orientation.BOTTOM,
    [Orientation.BOTTOM]: Orientation.NORTH,
    [Orientation.NORTH]: Orientation.TOP,
  },
  right: {
    [Orientation.TOP]: Orientation.EAST,
    [Orientation.EAST]: Orientation.BOTTOM,
    [Orientation.BOTTOM]: Orientation.WEST,
    [Orientation.WEST]: Orientation.TOP,
  },
  left: {
    [Orientation.TOP]: Orientation.WEST,
    [Orientation.WEST]: Orientation.BOTTOM,
    [Orientation.BOTTOM]: Orientation.EAST,
    [Orientation.EAST]: Orientation.TOP,
  },
};

export class CubeOrientation {
  constructor(public readonly x: Orientation, public readonly y: Orientation) {
    if (!Z_FROM_XY.has(XY_KEY(x, y))) {
      throw new Error(`Invalid orientation combination: ${x}/${y}`);
    }
  }

  get key(): string {
    return XY_KEY(this.x, this.y);
  }

  get z(): Orientation {
    return Z_FROM_XY.get(this.key)!;
  }

  roll(direction: DiceRotation): CubeOrientation {
    const table = ROLL_TABLE[direction];
    const rotate = (orientation: Orientation): Orientation =>
      table?.[orientation] ?? orientation;
    return new CubeOrientation(rotate(this.x), rotate(this.y));
  }

  static identity(): CubeOrientation {
    return new CubeOrientation(Orientation.EAST, Orientation.NORTH);
  }
}

const DEFAULT_ORIENTATION = CubeOrientation.identity();

const ALL_ORIENTATIONS = XY_ORIENTATIONS.map(([x, y]) => new CubeOrientation(x, y));

const ORIENTATION_CODE_SEQUENCE = "abcdefghijklmnopqrstuvwx";
if (ORIENTATION_CODE_SEQUENCE.length !== ALL_ORIENTATIONS.length) {
  throw new Error("Orientation code sequence length mismatch.");
}

const ORIENTATION_BY_CODE = new Map<string, CubeOrientation>();
ORIENTATION_CODE_SEQUENCE.split("").forEach((code, index) => {
  ORIENTATION_BY_CODE.set(code, ALL_ORIENTATIONS[index]);
});

export const getOrientationByCode = (code: string): CubeOrientation | null => {
  return ORIENTATION_BY_CODE.get(code.toLowerCase()) ?? null;
};

type DigitOrientationPredicate = (orientation: CubeOrientation) => boolean;

export const DIGIT_ORIENTATION_PREDICATES: Record<number, DigitOrientationPredicate> = {
  1: (orientation) => orientation.z === Orientation.TOP,
  2: (orientation) => orientation.y === Orientation.BOTTOM,
  3: (orientation) => orientation.x === Orientation.TOP,
  4: (orientation) => orientation.x === Orientation.BOTTOM,
  5: (orientation) => orientation.y === Orientation.TOP,
  6: (orientation) => orientation.z === Orientation.BOTTOM,
};

export const ORIENTATIONS_FOR_TOP_DIGIT: Record<number, CubeOrientation[]> = (() => {
  const mapping = {} as Record<number, CubeOrientation[]>;
  for (const digit of DICE_DIGITS) {
    mapping[digit] = [];
  }
  for (const orientation of ALL_ORIENTATIONS) {
    for (const digit of DICE_DIGITS) {
      const predicate = DIGIT_ORIENTATION_PREDICATES[digit];
      if (predicate(orientation)) {
        mapping[digit].push(orientation);
      }
    }
  }
  return mapping;
})();

export const ORIENTATIONS_BY_TOP: Record<Orientation, CubeOrientation[]> = (() => {
  const mapping = {} as Record<Orientation, CubeOrientation[]>;
  Object.values(Orientation).forEach((orientation) => {
    mapping[orientation as Orientation] = [];
  });
  for (const orientation of ALL_ORIENTATIONS) {
    mapping[orientation.z].push(orientation);
  }
  return mapping;
})();

const ORIENTATION_INDEX_BY_KEY = new Map<string, number>();
ALL_ORIENTATIONS.forEach((orientation, index) => {
  ORIENTATION_INDEX_BY_KEY.set(orientation.key, index);
});

const ORIENTATION_ROTATION_SEQUENCES: DiceRotation[][] = (() => {
  const sequences: DiceRotation[][] = Array.from(
    { length: ALL_ORIENTATIONS.length },
    () => []
  );
  const visited = new Set<string>();
  const queue: Array<{ orientation: CubeOrientation; sequence: DiceRotation[] }> = [
    { orientation: DEFAULT_ORIENTATION, sequence: [] },
  ];
  visited.add(DEFAULT_ORIENTATION.key);

  while (queue.length > 0) {
    const { orientation, sequence } = queue.shift()!;
    const index = ORIENTATION_INDEX_BY_KEY.get(orientation.key);
    if (index !== undefined && sequences[index].length === 0) {
      sequences[index] = sequence;
    }
    for (const rotation of DICE_ROTATIONS) {
      const next = orientation.roll(rotation);
      if (visited.has(next.key)) {
        continue;
      }
      visited.add(next.key);
      queue.push({ orientation: next, sequence: [...sequence, rotation] });
    }
  }

  return sequences;
})();

export const getRotationSequence = (orientation: CubeOrientation): DiceRotation[] => {
  const index = ORIENTATION_INDEX_BY_KEY.get(orientation.key);
  if (index === undefined) {
    return [];
  }
  return ORIENTATION_ROTATION_SEQUENCES[index];
};
