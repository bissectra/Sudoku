import type { RequestedSolutionPair } from "./types";

export const parseRequestedSolutionPair = (): RequestedSolutionPair => {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) {
    return {
      startZeroBased: 0,
      goalZeroBased: 1,
      segmentCountValid: false,
      parsedStart: null,
      parsedGoal: null,
    };
  }

  const [startSegment, goalSegment] = segments;
  const parsedStart = Number(startSegment);
  const parsedGoal = Number(goalSegment);
  const validStart = Number.isFinite(parsedStart) && !Number.isNaN(parsedStart);
  const validGoal = Number.isFinite(parsedGoal) && !Number.isNaN(parsedGoal);
  const startZeroBased = validStart ? Math.max(0, Math.floor(parsedStart) - 1) : 0;
  const goalZeroBased = validGoal ? Math.max(0, Math.floor(parsedGoal) - 1) : 0;

  return {
    startZeroBased,
    goalZeroBased,
    segmentCountValid: true,
    parsedStart: validStart ? parsedStart : null,
    parsedGoal: validGoal ? parsedGoal : null,
  };
};
