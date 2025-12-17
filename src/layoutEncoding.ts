import { TOTAL_CELLS } from "./boardLayout";
import { CubeOrientation, getOrientationByCode, getOrientationCode } from "./orientation";

export type LayoutEntry = {
  cellIndex: number;
  orientation: CubeOrientation;
};

const CELL_INDEX_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const CELL_INDEX_FROM_CHAR = new Map<string, number>();
CELL_INDEX_ALPHABET.split("").forEach((char, index) => {
  CELL_INDEX_FROM_CHAR.set(char, index);
});

export const parseLayoutEntries = (layout: string): LayoutEntry[] => {
  const entriesMap = new Map<number, CubeOrientation>();
  const normalizedLength = Math.floor(layout.length / 2) * 2;
  for (let index = 0; index < normalizedLength; index += 2) {
    const cellChar = layout[index];
    const orientationChar = layout[index + 1];
    const cellIndex = CELL_INDEX_FROM_CHAR.get(cellChar);
    if (cellIndex === undefined || cellIndex >= TOTAL_CELLS) {
      continue;
    }
    const orientation = getOrientationByCode(orientationChar);
    if (orientation === null) {
      continue;
    }
    entriesMap.set(cellIndex, orientation);
  }
  const entries: LayoutEntry[] = [];
  Array.from(entriesMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([cellIndex, orientation]) => {
      entries.push({ cellIndex, orientation });
    });
  return entries;
};

export const encodeLayoutEntries = (entries: LayoutEntry[]): string =>
  entries
    .slice()
    .sort((a, b) => a.cellIndex - b.cellIndex)
    .map(
      ({ cellIndex, orientation }) =>
        `${CELL_INDEX_ALPHABET[cellIndex]}${getOrientationCode(orientation)}`
    )
    .join("");

export const normalizeLayoutString = (layout: string): string =>
  encodeLayoutEntries(parseLayoutEntries(layout));
