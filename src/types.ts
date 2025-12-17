export type Grid = string[];

export type DiceRotation = "left" | "up" | "right" | "down";
export type RotationAxis = "x" | "y";

export type RollingState = {
  cellIndex: number;
  targetCellIndex: number;
  rotation: DiceRotation;
  startTime: number;
};

export type RollingAnimation = RollingState & {
  progress: number;
};

export type SolutionLoadResult = {
  startGrid: Grid | null;
  goalGrid: Grid | null;
  label: string;
};
