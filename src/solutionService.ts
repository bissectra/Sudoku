import type { Grid, SolutionLoadResult } from "./types";
import { GRID_SIZE, TOTAL_CELLS } from "./boardLayout";
import { encodeLayoutEntries, parseLayoutEntries, type LayoutEntry } from "./layoutEncoding";

type LoadOptions = {
  layout?: string | null;
};

const createRandomGrid = (size: number): Grid => {
  const totalCells = size * size;
  const cells = Array<string>(totalCells).fill(".");
  const minDice = Math.max(1, Math.floor(totalCells * 0.2));
  const maxDice = Math.max(minDice, Math.floor(totalCells * 0.4));
  const diceCount = Math.floor(minDice + Math.random() * (maxDice - minDice));
  const chosenIndices = new Set<number>();
  while (chosenIndices.size < diceCount) {
    const index = Math.floor(Math.random() * totalCells);
    chosenIndices.add(index);
  }
  for (const index of chosenIndices) {
    cells[index] = "#";
  }

  return Array.from({ length: size }, (_, row) =>
    cells.slice(row * size, row * size + size).join("")
  );
};

const createGridFromLayoutEntries = (entries: LayoutEntry[]): Grid => {
  const cells = Array<string>(TOTAL_CELLS).fill(".");
  for (const { cellIndex } of entries) {
    if (cellIndex >= 0 && cellIndex < TOTAL_CELLS) {
      cells[cellIndex] = "#";
    }
  }
  return Array.from({ length: GRID_SIZE }, (_, row) =>
    cells.slice(row * GRID_SIZE, row * GRID_SIZE + GRID_SIZE).join("")
  );
};

const buildLayoutGrid = (
  layout: string | null | undefined
): { grid: Grid; normalizedLayout: string | null } => {
  if (!layout) {
    return { grid: createRandomGrid(GRID_SIZE), normalizedLayout: null };
  }
  const entries = parseLayoutEntries(layout);
  if (entries.length === 0) {
    return { grid: createRandomGrid(GRID_SIZE), normalizedLayout: null };
  }
  const normalizedLayout = encodeLayoutEntries(entries);
  return {
    grid: createGridFromLayoutEntries(entries),
    normalizedLayout,
  };
};

export const loadSolutions = async (
  options?: LoadOptions
): Promise<SolutionLoadResult> => {
  const { grid, normalizedLayout } = buildLayoutGrid(options?.layout);
  return {
    startGrid: grid,
    goalGrid: grid,
    label: normalizedLayout ? "URL layout" : "Random grid",
    startOrientationLayout: normalizedLayout,
  };
};
