import type { RequestedIndexInfo } from "./types";

export const parseRequestedIndex = (): RequestedIndexInfo => {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return {
      zeroBasedIndex: 0,
      hasSegment: false,
      parsedValue: null,
    };
  }

  const lastSegment = segments[segments.length - 1];
  const parsed = Number(lastSegment);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return {
      zeroBasedIndex: 0,
      hasSegment: true,
      parsedValue: null,
    };
  }

  const zeroBased = Math.max(0, Math.floor(parsed) - 1);
  return {
    zeroBasedIndex: zeroBased,
    hasSegment: true,
    parsedValue: parsed,
  };
};
