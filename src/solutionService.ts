import type { Grid, RequestedGoal, SolutionPayload, SolutionLoadResult } from "./types";

export const loadSolutions = async (
  requested: RequestedGoal
): Promise<SolutionLoadResult> => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}solutions.json`);
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

    const baseUrl = import.meta.env.BASE_URL ?? "/";
    const fallbackPath = `${baseUrl}1`;
    const invalidSegment =
      !requested.segmentCountValid ||
      requested.parsedGoal === null ||
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

    const goalIndex = requested.goalZeroBased;
    const label = `Goal ${goalIndex + 1} of ${payload.length}`;
    const goalGrid = payload[goalIndex];
    return {
      startGrid: goalGrid,
      goalGrid,
      label,
    };
  } catch (error) {
    console.error(error);
    return { startGrid: null, goalGrid: null, label: "Unable to load solutions" };
  }
};
