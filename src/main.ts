import p5 from "p5";

type Grid = string[];

type SolutionPayload = Grid[];

type RequestedIndexInfo = {
  zeroBasedIndex: number;
  hasSegment: boolean;
  parsedValue: number | null;
};

type RendererWithCamera = {
  _curCamera?: {
    cameraMatrix?: {
      multiplyPoint(point: p5.Vector): p5.Vector;
    };
  };
  uPMatrix?: {
    multiplyAndNormalizePoint(point: p5.Vector): { x: number; y: number };
  };
};

type RendererAwareP5 = p5 & { _renderer?: RendererWithCamera };


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
  const GRID_SIZE = 8;
  const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
  const cellSize = 50;
  const cellSpacing = 8;
  const boxDepth = cellSize * 0.25;
  const gridDimension = cellSize * GRID_SIZE + cellSpacing * (GRID_SIZE - 1);
  const lightColor = [240, 230, 255];

  const RANDOM_SEED = 0xdeadbeef;
  let rngState = RANDOM_SEED;
  const seededRandom = (): number => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 0x100000000;
  };

  const axisOptions = [0, 90, 180, 270];
  const randomAxisRotation = (): number =>
    axisOptions[Math.floor(seededRandom() * axisOptions.length)];
  const diceCellsMask = Array.from({ length: TOTAL_CELLS }, () => seededRandom() < 0.45);
  if (!diceCellsMask.some(Boolean)) {
    diceCellsMask[0] = true;
  }
  const diceOrientations = diceCellsMask.map(() => ({
    x: randomAxisRotation(),
    y: randomAxisRotation(),
    z: randomAxisRotation(),
  }));

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

  const drawDice = (): void => {
    // Dice body
    s.noStroke();
    s.ambientMaterial(235, 232, 220); // warm ivory
    s.specularMaterial(250);
    s.shininess(20);
    s.box(1);

    // Dice edges -- uncomment to enable
    // s.noFill();
    // s.stroke(180);
    // s.strokeWeight(0.5);
    // s.box(1.01);

    const pipRadius = 0.15;
    const faceOffset = 0.5;
    const pipOffset = 0.2;

    // Draw pips for each face
    const faceValues = [1, 2, 3, 4, 5, 6];
    const faceNormals = [
      [0, 1, 0], // top
      [0, 0, 1], // front
      [1, 0, 0], // right
      [-1, 0, 0], // left
      [0, 0, -1], // back
      [0, -1, 0], // bottom
    ];

    for (let i = 0; i < faceValues.length; i += 1) {
      const faceValue = faceValues[i];
      const normal = faceNormals[i];
      const pips = dicePipPattern[faceValue];

      s.push();
      s.translate(
        (normal[0] * faceOffset),
        (normal[1] * faceOffset),
        (normal[2] * faceOffset)
      );
      if (normal[0] !== 0) {
        s.rotateY(normal[0] * 90);
      } else if (normal[1] !== 0) {
        s.rotateX(-normal[1] * 90);
      } else if (normal[2] === -1) {
        s.rotateY(180);
      }

      for (const pip of pips) {
        s.push();
        s.translate(pip[0] * pipOffset, pip[1] * pipOffset, 0.02);
        s.ambientMaterial(40, 40, 40); // soft charcoal
        s.shininess(10);
        s.noStroke();
        s.ellipse(0, 0, pipRadius, pipRadius);
        s.pop();
      }

      s.pop();
    }
  }

  const drawDiceForCell = (
    cellIndex: number,
    isHovered: boolean
  ): void => {
    const diceSize = cellSize * 0.8;
    const diceElevation = boxDepth / 2 + diceSize / 2 + 6;
    const orientation = diceOrientations[cellIndex];

    s.push();
    s.translate(0, 0, diceElevation);
    s.ambientMaterial(166, 199, 255);
    s.specularMaterial(255);
    s.stroke(210);
    s.strokeWeight(1);

    s.push();
    s.rotateX(orientation.x);
    s.rotateY(orientation.y);
    s.rotateZ(orientation.z);
    s.scale(diceSize);
    drawDice();
    s.pop();

    s.push();
    s.noStroke();
    const faceFill = isHovered ? 80 : 35;
    s.fill(faceFill);
    s.pop();
    if (isHovered) {
      s.push();
      s.noFill();
      const highlightPulse = Math.sin(s.frameCount * 0.06 + cellIndex) * 0.3 + 0.7;
      s.stroke(255, 215, 0, highlightPulse * 200);
      s.strokeWeight(2);
      s.box(diceSize + 6, diceSize + 6, diceSize + 6);
      s.pop();
    }
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

    const BOARD_ROTATION_X = 30;

    s.push();
    s.rotateX(BOARD_ROTATION_X);
    s.translate(-gridDimension / 2 + cellSize / 2, -gridDimension / 2 + cellSize / 2, 0);

    const renderer = (s as RendererAwareP5)._renderer;
    const cameraMatrix = renderer?._curCamera?.cameraMatrix;
    const projectionMatrix = renderer?.uPMatrix;
    const canProject = Boolean(cameraMatrix && projectionMatrix);
    const gridOffset = -gridDimension / 2 + cellSize / 2;
    const diceSize = cellSize * 0.6;
    const diceElevation = boxDepth / 2 + diceSize / 2 + 6;
    const depthOffset = boxDepth / 2 + diceElevation;
    const rotationRadians = s.radians(BOARD_ROTATION_X);
    const cosAngle = Math.cos(rotationRadians);
    const sinAngle = Math.sin(rotationRadians);

    const projectCellCenter = (row: number, col: number):
      | { screenX: number; screenY: number }
      | null => {
      if (!canProject || !cameraMatrix || !projectionMatrix) {
        return null;
      }
      const columnOffset = col * (cellSize + cellSpacing);
      const rowOffset = row * (cellSize + cellSpacing);
      const point = s.createVector(
        gridOffset + columnOffset,
        gridOffset + rowOffset,
        depthOffset
      );
      const rotatedY = point.y * cosAngle - point.z * sinAngle;
      const rotatedZ = point.y * sinAngle + point.z * cosAngle;
      point.y = rotatedY;
      point.z = rotatedZ;
      point.mult(1.5);
      const viewPoint = cameraMatrix.multiplyPoint(point);
      const ndc = projectionMatrix.multiplyAndNormalizePoint(viewPoint);
      if (!Number.isFinite(ndc.x) || !Number.isFinite(ndc.y)) {
        return null;
      }
      return {
        screenX: (ndc.x * 0.5 + 0.5) * s.width,
        screenY: ((-ndc.y) * 0.5 + 0.5) * s.height,
      };
    };

    const hoverThreshold = cellSize * 0.8;
    let bestHoverIndex: number | null = null;
    let bestHoverDistance = hoverThreshold;

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const cellIndex = row * GRID_SIZE + col;
        if (!diceCellsMask[cellIndex]) {
          continue;
        }
        const hoverPos = projectCellCenter(row, col);
        if (!hoverPos) {
          continue;
        }
        const hoverDistance = Math.hypot(
          hoverPos.screenX - s.mouseX,
          hoverPos.screenY - s.mouseY
        );
        if (hoverDistance < bestHoverDistance) {
          bestHoverDistance = hoverDistance;
          bestHoverIndex = cellIndex;
        }
      }
    }

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
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

        const cellIndex = row * GRID_SIZE + col;

        const shouldRenderDice = diceCellsMask[cellIndex];
        const isHovered = shouldRenderDice && bestHoverIndex === cellIndex;
        if (shouldRenderDice) {
          drawDiceForCell(cellIndex, isHovered);
        }
        s.pop();
      }
    }

    s.pop();
  };

  s.draw = (): void => {
    s.background(18);
    const [lightR, lightG, lightB] = lightColor;
    const ambientStrength = 0.4;
    s.ambientLight(lightR * ambientStrength, lightG * ambientStrength, lightB * ambientStrength);

    // Directional light
    s.directionalLight(lightR, lightG, lightB, 1, 0, -1);

  
    // uncomment to enable mouse orbit control
    s.orbitControl();
    s.push();
    s.scale(1.5);
    drawGrid();
    s.pop();
  };
};

new p5(sketch);
