import type { RequestedGoal } from "./types";

export const parseRequestedGoal = (): RequestedGoal => {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length !== 1) {
    return {
      goalZeroBased: 0,
      segmentCountValid: false,
      parsedGoal: null,
    };
  }

  const [goalSegment] = segments;
  const parsedGoal = Number(goalSegment);
  const validGoal = Number.isFinite(parsedGoal) && !Number.isNaN(parsedGoal);
  const goalZeroBased = validGoal ? Math.max(0, Math.floor(parsedGoal) - 1) : 0;

  return {
    goalZeroBased,
    segmentCountValid: validGoal,
    parsedGoal: validGoal ? parsedGoal : null,
  };
};
