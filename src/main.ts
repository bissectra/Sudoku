import p5 from "p5";

type Grid = string[];

type SolutionPayload = Grid[];

type RequestedIndexInfo = {
  zeroBasedIndex: number;
  hasSegment: boolean;
  parsedValue: number | null;
};

const parseRequestedIndex = (): RequestedIndexInfo => {
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

const sketch = (s: p5): void => {
  let payload: SolutionPayload | null = null;
  let selectedGrid: Grid | null = null;
  let solutionLabel = "Loading…";
  const requested = parseRequestedIndex();

  // Dimensions for the drawing grid
  const cellSize = 50;
  const cellSpacing = 8;

  const loadSolutions = async (): Promise<void> => {
    try {
      const response = await fetch("/solutions.json");
      if (!response.ok) {
        throw new Error(`Failed to load solutions.json (${response.status})`);
      }
      const data: SolutionPayload = await response.json();
      payload = data;
      if (payload.length === 0) {
        solutionLabel = "No solutions available";
        return;
      }

      const invalidSegment =
        requested.hasSegment &&
        (requested.parsedValue === null ||
          requested.parsedValue < 1 ||
          requested.parsedValue > payload.length);

      if (invalidSegment) {
        if (window.location.pathname !== "/1") {
          window.location.replace("/1");
        }
        return;
      }

      const targetIndex = requested.hasSegment ? requested.zeroBasedIndex : 0;
      selectedGrid = payload[targetIndex];
      solutionLabel = `Solution ${targetIndex + 1} of ${payload.length}`;
    } catch (error) {
      console.error(error);
      solutionLabel = "Unable to load solutions";
    }
  };

  s.preload = (): void => {
    // Keep placeholder while we fetch async data
  };

  s.setup = (): void => {
    s.createCanvas(window.innerWidth, window.innerHeight, s.WEBGL);
    s.angleMode(s.DEGREES);
    s.textFont("Helvetica", 18);
    s.textAlign(s.CENTER, s.CENTER);
    if (window.devicePixelRatio > 1) {
      s.pixelDensity(window.devicePixelRatio);
    }
    s.noStroke();
    loadSolutions();
  };

  s.windowResized = (): void => {
    s.resizeCanvas(window.innerWidth, window.innerHeight);
  };

  const drawGrid = (): void => {
    if (!selectedGrid) {
      return;
    }

    const gridDimension = cellSize * 8 + cellSpacing * 7;

    s.push();
    s.rotateX(30);
    s.translate(-gridDimension / 2 + cellSize / 2, -gridDimension / 2 + cellSize / 2, 0);

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const value = selectedGrid[row][col];
        const isFilled = value === "#";
        const boxDepth = cellSize * 0.25;

        s.push();
        const columnOffset = col * (cellSize + cellSpacing);
        const rowOffset = row * (cellSize + cellSpacing);
        s.translate(columnOffset, rowOffset, boxDepth / 2);

        s.fill(isFilled ? s.color("#28c17a") : s.color(255));
        s.stroke(40);
        s.strokeWeight(1);
        s.box(cellSize, cellSize, boxDepth);
        s.pop();
      }
    }

    s.pop();
  };

  const drawOverlayText = (): void => {
    s.push();
    s.resetMatrix();
    s.fill(255);
    s.textSize(22);
    s.text(solutionLabel, 0, -s.height / 2 + 30);
    s.pop();
  };

  s.draw = (): void => {
    s.background(18);
    s.ambientLight(60);
    s.directionalLight(255, 255, 255, 0, 1, 0);
    drawGrid();
    drawOverlayText();
  };
};

new p5(sketch);
