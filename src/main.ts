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
  const refreshInfoLabel = (): void => {
    const infoEl = document.getElementById("info");
    if (infoEl) {
      infoEl.textContent = solutionLabel;
    }
  };
  refreshInfoLabel();
  const requested = parseRequestedIndex();

  // Dimensions for the drawing grid
  const cellSize = 50;
  const cellSpacing = 8;
  const boxDepth = cellSize * 0.25;

  const dicePipPattern: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [
      [-1, -1],
      [1, 1],
    ],
    3: [
      [-1, -1],
      [0, 0],
      [1, 1],
    ],
    4: [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
    5: [
      [-1, -1],
      [-1, 1],
      [0, 0],
      [1, -1],
      [1, 1],
    ],
    6: [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ],
  };

  const drawDiceForCell = (row: number, col: number): void => {
    const diceSize = cellSize * 0.6;
    const pipGap = diceSize * 0.26;
    const pipRadius = diceSize * 0.1;
    const pipDepth = diceSize * 0.18;
    const pipThickness = 0.25;
    const diceValue = ((row * 8 + col) % 6) + 1;
    const pipPositions = dicePipPattern[diceValue] ?? dicePipPattern[1];
    const diceElevation = boxDepth / 2 + diceSize / 2 + 6;

    s.push();
    s.translate(0, 0, diceElevation);
    s.ambientMaterial(166, 199, 255);
    s.specularMaterial(255);
    s.stroke(210);
    s.strokeWeight(1);
    s.box(diceSize, diceSize, diceSize);

    s.push();
    s.noStroke();
    s.fill(35);
    const pipZ = diceSize / 2 + 0.3;
    pipPositions.forEach(([offsetX, offsetY]) => {
      s.push();
      s.translate(offsetX * pipGap, offsetY * pipGap, pipZ);
      s.scale(1, 1, pipThickness);
      s.noStroke();
      s.fill(0);
      s.specularMaterial(10);
      s.shininess(40);
      s.sphere(pipRadius, 20, 16);
      s.pop();
    });
    s.pop();
    s.pop();
  };

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
        refreshInfoLabel();
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
      refreshInfoLabel();
    } catch (error) {
      console.error(error);
      solutionLabel = "Unable to load solutions";
      refreshInfoLabel();
    }
  };

  s.preload = (): void => {
    // Keep placeholder while we fetch async data
  };

  s.setup = (): void => {
    s.createCanvas(window.innerWidth, window.innerHeight, s.WEBGL);
    s.angleMode(s.DEGREES);
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

        s.push();
        const columnOffset = col * (cellSize + cellSpacing);
        const rowOffset = row * (cellSize + cellSpacing);
        s.translate(columnOffset, rowOffset, boxDepth / 2);

        const filledColor = s.color(70, 130, 180); // Steel Blue
        const emptyColor = s.color(240, 248, 255); // Alice Blue

        s.fill(isFilled ? filledColor : emptyColor);
        s.stroke(40);
        s.strokeWeight(1);
        s.box(cellSize, cellSize, boxDepth);

        drawDiceForCell(row, col);
        s.pop();
      }
    }

    s.pop();
  };

  s.draw = (): void => {
    s.background(18);
    s.ambientLight(60);
    s.directionalLight(255, 255, 255, 0, 1, 0);
    s.orbitControl();
    s.push();
    s.scale(1.5);
    drawGrid();
    s.pop();
  };
};

new p5(sketch);
