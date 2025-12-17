import type { Grid, SolutionLoadResult } from "./types";
import { GRID_SIZE, TOTAL_CELLS } from "./boardLayout";

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

const normalizeOrientationLayout = (layout: string): string => {
  const filtered = layout.toLowerCase().replace(/[^a-x_]/g, "");
  return filtered.slice(0, TOTAL_CELLS).padEnd(TOTAL_CELLS, "_");
};

const createGridFromOrientationLayout = (layout: string): Grid => {
  return Array.from({ length: GRID_SIZE }, (_, row) => {
    const segment = layout.slice(row * GRID_SIZE, row * GRID_SIZE + GRID_SIZE);
    const rowCells = Array.from(segment, (cell) => (cell === "_" ? "." : "#"));
    return rowCells.join("");
  });
};

export const loadSolutions = async (
  options?: LoadOptions
): Promise<SolutionLoadResult> => {
  let startGrid: Grid;
  let startOrientationLayout: string | null = null;

  if (options?.layout !== undefined && options.layout !== null) {
    const normalizedLayout = normalizeOrientationLayout(options.layout);
    startOrientationLayout = normalizedLayout;
    startGrid = createGridFromOrientationLayout(normalizedLayout);
  } else {
    startGrid = createRandomGrid(GRID_SIZE);
  }

  return {
    startGrid,
    goalGrid: startGrid,
    label: startOrientationLayout ? "URL layout" : "Random grid",
    startOrientationLayout,
  };
};
