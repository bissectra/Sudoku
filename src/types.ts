export type Grid = string[];

export type SolutionPayload = Grid[];

export type RequestedIndexInfo = {
  zeroBasedIndex: number;
  hasSegment: boolean;
  parsedValue: number | null;
};

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
