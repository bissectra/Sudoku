import type { DiceRotation } from "./types";

type Point = {
  x: number;
  y: number;
};

export class InteractionController {
  public hoveredDiceCell: number | null = null;
  private activeDragCell: number | null = null;
  private lastDragPoint: Point | null = null;
  private dragRotationApplied = false;

  constructor(private readonly dragDistanceThreshold: number) {}

  setHover(cellIndex: number | null): void {
    this.hoveredDiceCell = cellIndex;
  }

  startDrag(cellIndex: number | null, point: Point): boolean {
    if (cellIndex === null) {
      return false;
    }
    this.activeDragCell = cellIndex;
    this.lastDragPoint = point;
    this.dragRotationApplied = false;
    return true;
  }

  recordMovement(point: Point): { rotation: DiceRotation; cellIndex: number } | null {
    if (
      this.activeDragCell === null ||
      this.lastDragPoint === null ||
      this.dragRotationApplied
    ) {
      return null;
    }
    const dx = point.x - this.lastDragPoint.x;
    const dy = point.y - this.lastDragPoint.y;
    if (Math.hypot(dx, dy) < this.dragDistanceThreshold) {
      return null;
    }
    const rotation: DiceRotation =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
        ? "down"
        : "up";
    this.dragRotationApplied = true;
    this.lastDragPoint = point;
    return { rotation, cellIndex: this.activeDragCell };
  }

  resetDrag(): void {
    this.activeDragCell = null;
    this.lastDragPoint = null;
    this.dragRotationApplied = false;
  }
}
