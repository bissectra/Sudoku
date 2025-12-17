import {
  CubeOrientation,
  DICE_DIGITS,
  DICE_ROTATIONS,
  DIGIT_ORIENTATION_PREDICATES,
  ORIENTATIONS_FOR_TOP_DIGIT,
} from "./orientation";
import type { DiceRotation, Grid, RollingAnimation, RollingState } from "./types";

const RANDOM_SEED = 0xdeadbeef;
const ROLL_DURATION_MS = 320;
const INVALID_HIGHLIGHT_DURATION_MS = 600;
const INVERSE_ROTATION: Record<DiceRotation, DiceRotation> = {
  left: "right",
  right: "left",
  up: "down",
  down: "up",
};

type PendingRollback = {
  sourceCellIndex: number;
  targetCellIndex: number;
  rotation: DiceRotation;
};

export class DiceController {
  public readonly diceCellsMask: boolean[];
  public readonly diceOrientations: CubeOrientation[];
  private rngState: number;
  private rollingState: RollingState | null = null;
  private pendingRollback: PendingRollback | null = null;
  private invalidHighlightCell: number | null = null;
  private invalidHighlightExpiry = 0;
  private readonly gridSize: number;
  private readonly totalCells: number;

  constructor(gridSize: number, seed = RANDOM_SEED) {
    this.gridSize = gridSize;
    this.totalCells = gridSize * gridSize;
    this.rngState = seed;
    this.diceCellsMask = Array(this.totalCells).fill(false);
    this.diceOrientations = Array.from(
      { length: this.totalCells },
      () => this.randomDiceOrientation()
    );
  }

  private seededRandom(): number {
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 0x100000000;
  }

  private randomDiceOrientation(): CubeOrientation {
    let orientation = CubeOrientation.identity();
    const rotationCount = 1 + Math.floor(this.seededRandom() * 3);
    for (let i = 0; i < rotationCount; i += 1) {
      const rotation = DICE_ROTATIONS[Math.floor(this.seededRandom() * DICE_ROTATIONS.length)];
      orientation = orientation.roll(rotation);
    }
    return orientation;
  }

  private shuffleArray<T>(items: T[]): T[] {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.seededRandom() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private pickRandomElement<T>(items: T[]): T {
    const index = Math.floor(this.seededRandom() * items.length);
    return items[index];
  }

  private buildPartialLatinSquare(grid: Grid): Array<number | null> {
    const height = grid.length;
    const width = height > 0 ? grid[0].length : this.gridSize;
    if (height !== this.gridSize || width !== this.gridSize) {
      throw new Error("Grid dimensions mismatch when building Latin square.");
    }
    const assignments: Array<number | null> = new Array(this.totalCells).fill(null);
    const rowUsed: Set<number>[] = Array.from({ length: height }, () => new Set());
    const colUsed: Set<number>[] = Array.from({ length: width }, () => new Set());
    const positions: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        if (grid[row][col] === "#") {
          positions.push({ row, col });
        }
      }
    }
    const orderedPositions = this.shuffleArray(positions);

    const solve = (index: number): boolean => {
      if (index === orderedPositions.length) {
        return true;
      }
      const { row, col } = orderedPositions[index];
      const options = DICE_DIGITS.filter(
        (digit) => !rowUsed[row].has(digit) && !colUsed[col].has(digit)
      );
      const shuffledOptions = this.shuffleArray(options);
      if (shuffledOptions.length === 0) {
        return false;
      }
      const cellIndex = row * width + col;
      for (const digit of shuffledOptions) {
        assignments[cellIndex] = digit;
        rowUsed[row].add(digit);
        colUsed[col].add(digit);
        if (solve(index + 1)) {
          return true;
        }
        rowUsed[row].delete(digit);
        colUsed[col].delete(digit);
        assignments[cellIndex] = null;
      }
      return false;
    };

    if (!solve(0)) {
      throw new Error("Unable to complete Latin square for that grid.");
    }

    return assignments;
  }

  private randomOrientationForTopValue(value: number): CubeOrientation {
    const candidates = ORIENTATIONS_FOR_TOP_DIGIT[value];
    if (!candidates || candidates.length === 0) {
      throw new Error(`No orientations defined for top face value ${value}`);
    }
    return this.pickRandomElement(candidates);
  }

  private getTargetCellIndex(cellIndex: number, rotation: DiceRotation): number | null {
    const row = Math.floor(cellIndex / this.gridSize);
    const col = cellIndex % this.gridSize;
    let targetRow = row;
    let targetCol = col;
    switch (rotation) {
      case "left":
        targetCol -= 1;
        break;
      case "right":
        targetCol += 1;
        break;
      case "up":
        targetRow -= 1;
        break;
      case "down":
        targetRow += 1;
        break;
      default:
        break;
    }
    if (
      targetRow < 0 ||
      targetRow >= this.gridSize ||
      targetCol < 0 ||
      targetCol >= this.gridSize
    ) {
      return null;
    }
    return targetRow * this.gridSize + targetCol;
  }

  setDiceMaskFromGrid(grid: Grid): void {
    const latinAssignment = this.buildPartialLatinSquare(grid);
    const height = grid.length;
    const width = height > 0 ? grid[0].length : this.gridSize;
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const cellIndex = row * this.gridSize + col;
        const hasDice = grid[row][col] === "#";
        this.diceCellsMask[cellIndex] = hasDice;
        if (hasDice) {
          const digit = latinAssignment[cellIndex];
          if (digit === null) {
            throw new Error("Dice cell missing top-face digit after Latin square generation.");
          }
          this.diceOrientations[cellIndex] = this.randomOrientationForTopValue(digit);
        }
      }
    }
  }

  private isLatinSquareValid(): boolean {
    const rowSets: Set<number>[] = Array.from({ length: this.gridSize }, () => new Set());
    const colSets: Set<number>[] = Array.from({ length: this.gridSize }, () => new Set());
    for (let index = 0; index < this.totalCells; index += 1) {
      if (!this.diceCellsMask[index]) {
        continue;
      }
      const value = this.getTopFaceValue(index);
      if (value === null) {
        continue;
      }
      const row = Math.floor(index / this.gridSize);
      const col = index % this.gridSize;
      if (rowSets[row].has(value) || colSets[col].has(value)) {
        return false;
      }
      rowSets[row].add(value);
      colSets[col].add(value);
    }
    return true;
  }

  private getTopFaceValueFromOrientation(orientation: CubeOrientation): number {
    for (const digit of DICE_DIGITS) {
      const predicate = DIGIT_ORIENTATION_PREDICATES[digit];
      if (predicate(orientation)) {
        return digit;
      }
    }
    throw new Error("Unable to determine top face value for dice orientation.");
  }

  getTopFaceValue(cellIndex: number): number | null {
    if (!this.diceCellsMask[cellIndex]) {
      return null;
    }
    return this.getTopFaceValueFromOrientation(this.diceOrientations[cellIndex]);
  }

  getTopFaceValues(): Array<number | null> {
    return Array.from({ length: this.totalCells }, (_, index) =>
      this.getTopFaceValue(index)
    );
  }

  computeRollingAnimation(): RollingAnimation | null {
    if (this.rollingState === null) {
      return null;
    }
    const elapsed = performance.now() - this.rollingState.startTime;
    return {
      ...this.rollingState,
      progress: Math.min(1, elapsed / ROLL_DURATION_MS),
    };
  }

  processFrame(): void {
    const now = performance.now();
    if (
      this.pendingRollback &&
      now >= this.invalidHighlightExpiry &&
      this.rollingState === null
    ) {
      const rollback = this.pendingRollback;
      this.pendingRollback = null;
      this.invalidHighlightCell = null;
      this.startRollingAnimation(rollback.sourceCellIndex, rollback.rotation);
    }
  }

  isCellInvalidHighlight(cellIndex: number): boolean {
    return this.invalidHighlightCell === cellIndex;
  }

  startRollingAnimation(cellIndex: number, rotation: DiceRotation): void {
    if (!this.diceCellsMask[cellIndex]) {
      return;
    }
    if (this.pendingRollback !== null) {
      return;
    }
    const targetCellIndex = this.getTargetCellIndex(cellIndex, rotation);
    if (targetCellIndex === null || this.diceCellsMask[targetCellIndex]) {
      return;
    }
    this.rollingState = {
      cellIndex,
      targetCellIndex,
      rotation,
      startTime: performance.now(),
    };
  }

  finalizeRollingAnimation(): void {
    if (this.rollingState === null) {
      return;
    }
    const { cellIndex, targetCellIndex, rotation } = this.rollingState;
    this.diceOrientations[targetCellIndex] = this.diceOrientations[cellIndex].roll(rotation);
    this.diceCellsMask[cellIndex] = false;
    this.diceCellsMask[targetCellIndex] = true;
    this.rollingState = null;
    if (!this.isLatinSquareValid()) {
      this.handleInvalidMove(cellIndex, targetCellIndex, rotation);
    }
  }

  private handleInvalidMove(
    cellIndex: number,
    targetCellIndex: number,
    rotation: DiceRotation
  ): void {
    this.invalidHighlightCell = targetCellIndex;
    this.invalidHighlightExpiry = performance.now() + INVALID_HIGHLIGHT_DURATION_MS;
    this.pendingRollback = {
      sourceCellIndex: targetCellIndex,
      targetCellIndex: cellIndex,
      rotation: INVERSE_ROTATION[rotation],
    };
  }

  getRollingState(): RollingState | null {
    return this.rollingState;
  }
}
