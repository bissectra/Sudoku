import type { Grid, RequestedSolutionPair, SolutionPayload, SolutionLoadResult } from "./types";

export const loadSolutions = async (
  requested: RequestedSolutionPair
): Promise<SolutionLoadResult> => {
  try {
    const response = await fetch("/solutions.json");
    if (!response.ok) {
      throw new Error(`Failed to load solutions.json (${response.status})`);
    }
    const payload: SolutionPayload = await response.json();
    if (payload.length === 0) {
      return { startGrid: null, goalGrid: null, label: "No solutions available" };
    }

    if (payload.length < 2) {
      const onlyGrid = payload[0];
      return {
        startGrid: onlyGrid,
        goalGrid: onlyGrid,
        label: "Need at least two solutions to display start and goal",
      };
    }

    const fallbackPath = "/1/2";
    const invalidSegment =
      !requested.segmentCountValid ||
      requested.parsedStart === null ||
      requested.parsedGoal === null ||
      requested.parsedStart < 1 ||
      requested.parsedStart > payload.length ||
      requested.parsedGoal < 1 ||
      requested.parsedGoal > payload.length;

    if (invalidSegment) {
      return {
        startGrid: null,
        goalGrid: null,
        label: "",
        redirectTo: fallbackPath,
      };
    }

    const startIndex = requested.startZeroBased;
    const goalIndex = requested.goalZeroBased;

    if (startIndex === goalIndex) {
      return {
        startGrid: null,
        goalGrid: null,
        label: "",
        redirectTo: fallbackPath,
      };
    }

    const label = `Start ${startIndex + 1} → Goal ${goalIndex + 1} of ${payload.length}`;
    return {
      startGrid: payload[startIndex],
      goalGrid: payload[goalIndex],
      label,
    };
  } catch (error) {
    console.error(error);
    return { startGrid: null, goalGrid: null, label: "Unable to load solutions" };
  }
};
