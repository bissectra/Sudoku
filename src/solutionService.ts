import type { Grid, SolutionLoadResult } from "./types";
import { GRID_SIZE } from "./boardLayout";

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

export const loadSolutions = async (): Promise<SolutionLoadResult> => {
  const grid = createRandomGrid(GRID_SIZE);
  return {
    startGrid: grid,
    goalGrid: grid,
    label: "Random grid",
  };
};
