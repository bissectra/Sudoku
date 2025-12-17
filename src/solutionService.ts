import type { Grid, RequestedIndexInfo, SolutionPayload } from "./types";

export type SolutionLoadResult = {
  grid: Grid | null;
  label: string;
  redirectTo?: string;
};

export const loadSolutions = async (
  requested: RequestedIndexInfo
): Promise<SolutionLoadResult> => {
  try {
    const response = await fetch("/solutions.json");
    if (!response.ok) {
      throw new Error(`Failed to load solutions.json (${response.status})`);
    }
    const payload: SolutionPayload = await response.json();
    if (payload.length === 0) {
      return { grid: null, label: "No solutions available" };
    }

    const invalidSegment =
      requested.hasSegment &&
      (requested.parsedValue === null ||
        requested.parsedValue < 1 ||
        requested.parsedValue > payload.length);

    if (invalidSegment) {
      return { grid: null, label: "", redirectTo: "/1" };
    }

    const targetIndex = requested.hasSegment ? requested.zeroBasedIndex : 0;
    const label = `Solution ${targetIndex + 1} of ${payload.length}`;
    return {
      grid: payload[targetIndex],
      label,
    };
  } catch (error) {
    console.error(error);
    return { grid: null, label: "Unable to load solutions" };
  }
};
