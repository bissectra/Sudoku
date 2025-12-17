import { CubeOrientation, DICE_ROTATIONS } from "./orientation";
import type { DiceRotation, RollingAnimation, RollingState } from "./types";

const RANDOM_SEED = 0xdeadbeef;
const ROLL_DURATION_MS = 320;

export class DiceController {
  public readonly diceCellsMask: boolean[];
  public readonly diceOrientations: CubeOrientation[];
  private rngState: number;
  private rollingState: RollingState | null = null;
  private readonly gridSize: number;

  constructor(gridSize: number, density = 0.45, seed = RANDOM_SEED) {
    this.gridSize = gridSize;
    this.rngState = seed;
    const totalCells = gridSize * gridSize;
    this.diceCellsMask = Array.from(
      { length: totalCells },
      () => this.seededRandom() < density
    );
    if (!this.diceCellsMask.some(Boolean)) {
      this.diceCellsMask[0] = true;
    }
    this.diceOrientations = this.diceCellsMask.map(() => this.randomDiceOrientation());
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
