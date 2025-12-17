#!/usr/bin/env python3
"""Generate a random partial Latin square for a chosen solution grid."""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Iterable, Sequence, Tuple

Grid = Sequence[str]
Coord = Tuple[int, int]
DIGITS = "123456"


def load_solutions(path: Path) -> list[Grid]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def find_sharp_cells(grid: Grid) -> list[Coord]:
    height = len(grid)
    width = len(grid[0]) if height else 0
    return [(row, col) for row in range(height) for col in range(width) if grid[row][col] == "#"]


def build_partial_latin(grid: Grid, positions: list[Coord]) -> list[list[str]]:
    filled: list[list[str]] = [list(row) for row in grid]
    max_cols = len(filled[0])
    row_used: list[set[str]] = [set() for _ in filled]
    col_used: list[set[str]] = [set() for _ in range(max_cols)]

    def solve(index: int) -> bool:
        if index == len(positions):
            return True

        row, col = positions[index]
        options = [d for d in DIGITS if d not in row_used[row] and d not in col_used[col]]
        random.shuffle(options)
        for digit in options:
            filled[row][col] = digit
            row_used[row].add(digit)
            col_used[col].add(digit)

            if solve(index + 1):
                return True

            row_used[row].remove(digit)
            col_used[col].remove(digit)
        filled[row][col] = "#"
        return False

    if not solve(0):
        raise RuntimeError("Unable to complete Latin square for that grid.")

    return filled


def format_grid(grid: Iterable[Iterable[str]]) -> str:
    return "\n".join(" ".join(row) for row in grid)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a random partial Latin square from solutions.json."
    )
    parser.add_argument(
        "grid_index",
        type=int,
        help="1-based index of the grid inside solutions.json (use --zero-based for 0-based indexes)",
    )
    parser.add_argument(
        "--zero-based",
        action="store_true",
        help="Treat the provided grid_index as a zero-based offset.",
    )
    parser.add_argument(
        "--solutions",
        type=Path,
        default=Path("solutions.json"),
        help="Path to the sorted solutions JSON.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()
    solutions = load_solutions(args.solutions)

    offset = args.grid_index if args.zero_based else args.grid_index - 1
    if not (0 <= offset < len(solutions)):
        raise SystemExit(f"Grid index {args.grid_index} is out of range (1-{len(solutions)}).")

    grid = solutions[offset]
    positions = find_sharp_cells(grid)
    if not positions:
        raise SystemExit("Selected grid has no '#' cells.")

    random.shuffle(positions)
    latin_grid = build_partial_latin(grid, positions)

    print(format_grid(latin_grid))


if __name__ == "__main__":
    main()
