import { CubeOrientation, DICE_ROTATIONS } from "./orientation";
import type { DiceRotation, RollingAnimation, RollingState } from "./types";

const RANDOM_SEED = 0xdeadbeef;
const ROLL_DURATION_MS = 320;

export class DiceController {
  public readonly diceCellsMask: boolean[];
  public readonly diceOrientations: CubeOrientation[];
  private rngState: number;
  private rollingState: RollingState | null = null;

  constructor(gridSize: number, density = 0.45, seed = RANDOM_SEED) {
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
    this.rollingState = {
      cellIndex,
      rotation,
      startTime: performance.now(),
    };
  }

  finalizeRollingAnimation(): void {
    if (this.rollingState === null) {
      return;
    }
    const { cellIndex, rotation } = this.rollingState;
    this.diceOrientations[cellIndex] = this.diceOrientations[cellIndex].roll(rotation);
    this.rollingState = null;
  }

  getRollingState(): RollingState | null {
    return this.rollingState;
  }
}
