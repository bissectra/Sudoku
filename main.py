from itertools import combinations
from typing import List, Tuple
import json

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


def prettiness_score(grid: Grid) -> dict[str, float | int]:
    """Return raw features for lexicographic ordering (no aggregation).

    Keys:
    - transitions: total edge transitions (int)
    - components: connected '#' clusters (int)
    - std: row_std + col_std (float)
    - avg_dist: average distance to center (float)
    - row_std, col_std, filled_count (auxiliary fields)
    """

    # Edge transitions
    horiz = sum(1 for r in range(8) for c in range(7) if grid[r][c] != grid[r][c + 1])
    vert = sum(1 for r in range(7) for c in range(8) if grid[r][c] != grid[r + 1][c])
    transitions = horiz + vert  # int

    # Collect helper data
    filled_cells: list[tuple[int, int]] = [
        (c, r) for r in range(8) for c in range(8) if grid[r][c] == "#"
    ]
    filled_count = len(filled_cells)

    # Balance (std)
    row_counts = [grid[r].count("#") for r in range(8)]
    col_counts = [sum(1 for r in range(8) if grid[r][c] == "#") for c in range(8)]
    row_mean = sum(row_counts) / 8
    col_mean = sum(col_counts) / 8
    row_var = sum((rc - row_mean) ** 2 for rc in row_counts) / 8
    col_var = sum((cc - col_mean) ** 2 for cc in col_counts) / 8
    row_std = row_var ** 0.5
    col_std = col_var ** 0.5
    std_total = row_std + col_std

    # Compactness (avg_dist)
    if filled_cells:
        cx, cy = 3.5, 3.5
        avg_dist = sum(((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 for x, y in filled_cells) / filled_count
    else:
        avg_dist = 0.0

    # Cohesion: number of connected components
    def component_count() -> int:
        seen = [[False] * 8 for _ in range(8)]
        dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        count = 0
        for r in range(8):
            for c in range(8):
                if grid[r][c] != "#" or seen[r][c]:
                    continue
                count += 1
                stack = [(r, c)]
                seen[r][c] = True
                while stack:
                    cr, cc = stack.pop()
                    for dr, dc in dirs:
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < 8 and 0 <= nc < 8 and not seen[nr][nc] and grid[nr][nc] == "#":
                            seen[nr][nc] = True
                            stack.append((nr, nc))
        return count

    components = component_count()

    return {
        "transitions": transitions,
        "components": components,
        "std": std_total,
        "avg_dist": avg_dist,
        "row_std": row_std,
        "col_std": col_std,
        "filled_count": filled_count,
    }


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
        breakdown = prettiness_score(grid)
        scored.append((breakdown, idx, grid))

    # Order: descending transitions, descending components, ascending avg_dist, ascending std, then index
    scored.sort(key=lambda x: (
        -x[0]["transitions"],
        x[0]["avg_dist"],
        x[0]["std"],
        x[1],
    ))

    lines: list[str] = [
        "Number of solutions: {}".format(len(scored))
    ]
    for new_idx, (score, _orig_idx, grid) in enumerate(scored, start=1):
        lines.append("")
        lines.append(
            "Solution {i}: transitions={t} | components={c} | avg_dist={d:.4f} | std={s:.4f}"
            .format(
                i=new_idx,
                t=score["transitions"],
                c=score["components"],
                d=score["avg_dist"],
                s=score["std"],
            )
        )
        lines.append(format_grid(grid))

    content = "\n".join(lines) + "\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote sorted solutions with scores to {path}")


def write_solutions_json(path: str = "solutions.json") -> None:
    """Generate a JSON file containing only an array of grids (no metadata).

    JSON structure:
    [
      ["........", ...],  # grid 1: 8 strings, each representing a row
      ["........", ...],  # grid 2
      ...
    ]
    """

    solutions = find_solutions()
    scored: list[tuple[dict[str, float | int], int, Grid]] = []
    for idx, sol in enumerate(solutions, start=1):
        grid = build_grid(sol)
        breakdown = prettiness_score(grid)
        scored.append((breakdown, idx, grid))

    # Same ordering as text: transitions desc, avg_dist asc, std asc, then index
    scored.sort(key=lambda x: (
        -x[0]["transitions"],
        x[0]["avg_dist"],
        x[0]["std"],
        x[1],
    ))

    output: list[Grid] = []

    for _new_idx, (_score, _orig_idx, grid) in enumerate(scored, start=1):
        output.append(grid)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"Wrote sorted solutions (JSON) to {path}")


def main() -> None:
    write_solutions_json("solutions.json")


if __name__ == "__main__":
    main()