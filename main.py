from itertools import combinations
from typing import List, Tuple

# Values for the 10 cells (a 4x4 upper-left triangle inside an 8x8 grid)
HOUSES = [
    4,
    8, 4,
    8, 8, 4,
    8, 8, 8, 4,
]

# Coordinates (x, y) of those 10 cells within the 8x8 grid
POSITIONS = [
    (0, 0),
    (0, 1), (1, 1),
    (0, 2), (1, 2), (2, 2),
    (0, 3), (1, 3), (2, 3), (3, 3),
]

TARGET_SUM = 36

Grid = List[str]

# ---------- 8x8 symmetries ----------
def symmetry_transforms(x: int, y: int):
    """Generators: Vertical, Horizontal, Main Diagonal, Secondary Diagonal reflections."""
    return [
        (7 - x, y),       # vertical center reflection
        (x, 7 - y),       # horizontal center reflection
        (y, x),           # main diagonal reflection
        (7 - y, 7 - x),   # secondary diagonal reflection
    ]


def compute_orbit(cell: tuple[int, int]):
    """Closure under the above symmetries (apply repeatedly until it stabilizes)."""
    seen = {cell}
    stack = [cell]
    while stack:
        x, y = stack.pop()
        for nx, ny in symmetry_transforms(x, y):
            if (nx, ny) not in seen:
                seen.add((nx, ny))
                stack.append((nx, ny))
    return seen


def build_grid(solution_indices: tuple[int, ...] | list[int]) -> Grid:
    """Return the 8x8 grid marking the orbits of the chosen indices."""
    grid = [["." for _ in range(8)] for _ in range(8)]
    for i in solution_indices:
        x, y = POSITIONS[i]
        for (nx, ny) in compute_orbit((x, y)):
            grid[ny][nx] = "#"
    return ["".join(row) for row in grid]


def format_grid(grid: Grid) -> str:
    """Return the grid as lines with spaces between characters."""
    return "\n".join(" ".join(row) for row in grid)


def prettiness_score(grid: Grid) -> float:
    # Count differing adjacent pairs (4-neighborhood)
    horiz = sum(1 for r in range(8) for c in range(7) if grid[r][c] != grid[r][c+1])
    vert = sum(1 for r in range(7) for c in range(8) if grid[r][c] != grid[r+1][c])
    total_edges = 8*7 + 8*7  # 112
    transitions = horiz + vert
    target = total_edges / 2  # prefer moderate complexity
    return 1.0 - abs(transitions - target) / target


def find_solutions() -> list[tuple[int, ...]]:
    """Find all index combinations whose values sum to the target."""
    n = len(HOUSES)
    return [
        comb
        for r in range(1, n + 1)
        for comb in combinations(range(n), r)
        if sum(HOUSES[i] for i in comb) == TARGET_SUM
    ]


def write_solutions_with_scores(path: str = "solution.txt") -> None:
    solutions = find_solutions()
    scored = []
    for idx, sol in enumerate(solutions, start=1):
        grid = build_grid(sol)
        score = prettiness_score(grid)
        scored.append((score, idx, grid))

    # Sort by score desc, tie-break by original index to keep determinism
    scored.sort(key=lambda x: (-x[0], x[1]))

    lines: list[str] = [f"Number of solutions: {len(scored)} (sorted by score desc)"]
    for new_idx, (score, _orig_idx, grid) in enumerate(scored, start=1):
        lines.append("")
        lines.append(f"Solution {new_idx}: score={score:.4f}")
        lines.append(format_grid(grid))

    content = "\n".join(lines) + "\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote sorted solutions with scores to {path}")


def main() -> None:
    write_solutions_with_scores("solutions.txt")


if __name__ == "__main__":
    main()