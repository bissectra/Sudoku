import p5 from "p5";

type Grid = string[];

type SolutionPayload = Grid[];

const parseRequestedIndex = (): number => {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return 0;
  }

  const lastSegment = segments[segments.length - 1];
  const parsed = Number(lastSegment);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return 0;
  }

  const zeroBased = Math.max(0, Math.floor(parsed) - 1);
  return zeroBased;
};

const sketch = (s: p5): void => {
  let payload: SolutionPayload | null = null;
  let selectedGrid: Grid | null = null;
  let solutionLabel = "Loading…";
  const requestedIndex = parseRequestedIndex();

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
      const boundedIndex = Math.min(Math.max(requestedIndex, 0), payload.length - 1);
      selectedGrid = payload[boundedIndex];
      solutionLabel = `Solution ${boundedIndex + 1} of ${payload.length}`;
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
    s.rotateX(60);
    s.translate(-gridDimension / 2 + cellSize / 2, -gridDimension / 2 + cellSize / 2, 0);

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const value = selectedGrid[row][col];
        const isFilled = value === "#";
        const boxDepth = isFilled ? cellSize * 0.55 : cellSize * 0.25;

        s.push();
        const columnOffset = col * (cellSize + cellSpacing);
        const rowOffset = row * (cellSize + cellSpacing);
        s.translate(columnOffset, rowOffset, boxDepth / 2);

        s.fill(isFilled ? "#28c17a" : 255);
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
    s.orbitControl(0.4, 0.4, 0);
    s.ambientLight(60);
    s.directionalLight(255, 255, 255, -0.5, -1, -0.5);
    drawGrid();
    drawOverlayText();
  };
};

new p5(sketch);
