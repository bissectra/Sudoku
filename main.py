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
    """Return a composite score that prefers balanced, cohesive shapes.

    Components:
    1) Edge transitions (existing): prefer ~50% boundary changes to avoid
       blobs or noise.
    2) Density: prefer fill ratio near half the board.
    3) Balance: even distribution of filled cells across rows/columns.
    4) Compactness: shapes closer to the board center.
    5) Cohesion: fewer connected components of filled cells.

    Each sub-score is normalized to [0,1] and combined with weights to
    reduce ties across solutions.
    """

    def clamp01(x: float) -> float:
        return max(0.0, min(1.0, x))

    # 1) Edge transitions (existing behavior)
    horiz = sum(1 for r in range(8) for c in range(7) if grid[r][c] != grid[r][c+1])
    vert = sum(1 for r in range(7) for c in range(8) if grid[r][c] != grid[r+1][c])
    total_edges = 8 * 7 + 8 * 7  # 112
    transitions = horiz + vert
    target_edges = total_edges / 2  # prefer moderate complexity
    transition_score = 1.0 - abs(transitions - target_edges) / target_edges

    # Collect helper data
    filled_cells: list[tuple[int, int]] = [
        (c, r) for r in range(8) for c in range(8) if grid[r][c] == "#"
    ]
    filled_count = len(filled_cells)

    # 2) Density: aim for half the board (32 of 64 cells)
    density_target = 32
    density_score = 1.0 - abs(filled_count - density_target) / density_target
    density_score = clamp01(density_score)

    # 3) Balance: even spread across rows and columns
    row_counts = [grid[r].count("#") for r in range(8)]
    col_counts = [sum(1 for r in range(8) if grid[r][c] == "#") for c in range(8)]
    row_mean = sum(row_counts) / 8
    col_mean = sum(col_counts) / 8
    row_var = sum((rc - row_mean) ** 2 for rc in row_counts) / 8
    col_var = sum((cc - col_mean) ** 2 for cc in col_counts) / 8
    row_std = row_var ** 0.5
    col_std = col_var ** 0.5
    # Max possible std is 8 when one row is full and others empty.
    balance_score = 1.0 - ((row_std + col_std) / 16)
    balance_score = clamp01(balance_score)

    # 4) Compactness: prefer shapes near the board center (3.5, 3.5)
    if filled_cells:
        cx, cy = 3.5, 3.5
        max_dist = (3.5 ** 2 + 3.5 ** 2) ** 0.5  # corner to center
        avg_dist = sum(((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 for x, y in filled_cells) / filled_count
        compactness_score = 1.0 - (avg_dist / max_dist)
    else:
        compactness_score = 0.0
    compactness_score = clamp01(compactness_score)

    # 5) Cohesion: fewer connected components of '#'
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
    cohesion_score = 1.0 / components if components > 0 else 0.0

    # Weighted blend (weights sum to 1.0)
    score = (
        0.45 * transition_score
        + 0.15 * density_score
        + 0.15 * balance_score
        + 0.15 * compactness_score
        + 0.10 * cohesion_score
    )

    # Clamp to [0,1] for safety
    return clamp01(score)


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