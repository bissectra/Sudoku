import {
  CubeOrientation,
  DICE_DIGITS,
  DICE_ROTATIONS,
  DIGIT_ORIENTATION_PREDICATES,
} from "./orientation";
import type { DiceRotation, Grid, RollingAnimation, RollingState } from "./types";

const RANDOM_SEED = 0xdeadbeef;
const ROLL_DURATION_MS = 320;

export class DiceController {
  public readonly diceCellsMask: boolean[];
  public readonly diceOrientations: CubeOrientation[];
  private rngState: number;
  private rollingState: RollingState | null = null;
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
    const rotationCount = 1 + Math.floor(this.seededRandom() * 100);
    for (let i = 0; i < rotationCount; i += 1) {
      const rotation =
        DICE_ROTATIONS[Math.floor(this.seededRandom() * DICE_ROTATIONS.length)];
      orientation = orientation.roll(rotation);
    }
    return orientation;
  }

  setDiceMaskFromGrid(grid: Grid): void {
    const height = grid.length;
    const width = height > 0 ? grid[0].length : this.gridSize;
    if (height !== this.gridSize || width !== this.gridSize) {
      throw new Error("Grid dimensions mismatch when setting dice mask.");
    }
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const cellIndex = row * this.gridSize + col;
        const hasDice = grid[row][col] === "#";
        this.diceCellsMask[cellIndex] = hasDice;
        if (hasDice) {
          this.diceOrientations[cellIndex] = this.randomDiceOrientation();
        }
      }
    }
  }

  setDiceOrientations(orientations: Array<CubeOrientation | null>): void {
    const limit = Math.min(orientations.length, this.totalCells);
    for (let index = 0; index < limit; index += 1) {
      const orientation = orientations[index];
      if (orientation !== null && this.diceCellsMask[index]) {
        this.diceOrientations[index] = orientation;
      }
    }
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
    // Reserved for future state updates.
  }

  startRollingAnimation(cellIndex: number, rotation: DiceRotation): void {
    if (!this.diceCellsMask[cellIndex]) {
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
  }

  getRollingState(): RollingState | null {
    return this.rollingState;
  }
}
