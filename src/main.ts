import p5 from "p5";

type Grid = string[];

type SolutionPayload = Grid[];

type RequestedIndexInfo = {
  zeroBasedIndex: number;
  hasSegment: boolean;
  parsedValue: number | null;
};

type Orientation = {
  front: number;
  back: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
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

const rotateX = (orientation: Orientation): Orientation => ({
  front: orientation.top,
  back: orientation.bottom,
  top: orientation.back,
  bottom: orientation.front,
  left: orientation.left,
  right: orientation.right,
});

const rotateY = (orientation: Orientation): Orientation => ({
  front: orientation.left,
  back: orientation.right,
  right: orientation.front,
  left: orientation.back,
  top: orientation.top,
  bottom: orientation.bottom,
});

const rotateZ = (orientation: Orientation): Orientation => ({
  front: orientation.front,
  back: orientation.back,
  top: orientation.right,
  bottom: orientation.left,
  right: orientation.bottom,
  left: orientation.top,
});

const generateOrientations = (): Orientation[] => {
  const base: Orientation = {
    top: 1,
    right: 2,
    back: 3,
    front: 4,
    left: 5,
    bottom: 6,
  };

    const encode = (orientation: Orientation): string =>
      `${orientation.front}-${orientation.back}-${orientation.left}-${orientation.right}-${orientation.top}-${orientation.bottom}`;

    const stack: Orientation[] = [base];
    const seen = new Set<string>();
    const orientations: Orientation[] = [];

    while (stack.length > 0 && seen.size < 24) {
      const current = stack.pop()!;
      const key = encode(current);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      orientations.push(current);
      stack.push(rotateZ(current), rotateX(rotateX(current)), rotateY(current));
    }

  return orientations;
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

  const orientationPresets = generateOrientations();

  // Dimensions for the drawing grid
  const cellSize = 50;
  const cellSpacing = 8;
  const boxDepth = cellSize * 0.25;
  const gridDimension = cellSize * 8 + cellSpacing * 7;
  const lightColor = [240, 230, 255];

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

  const drawDiceForCell = (
    orientation: Orientation,
    cellIndex: number,
    isHovered: boolean
  ): void => {
    const diceSize = cellSize * 0.8;
    const pipGap = diceSize * 0.26;
    const pipRadius = diceSize * 0.1;
    const pipThickness = 0.25;
    const diceElevation = boxDepth / 2 + diceSize / 2 + 6;

    s.push();
    s.translate(0, 0, diceElevation);
    s.ambientMaterial(166, 199, 255);
    s.specularMaterial(255);
    s.stroke(210);
    s.strokeWeight(1);
    s.box(diceSize, diceSize, diceSize);

    const drawFacePips = (
      rotX = 0,
      rotY = 0,
      rotZ = 0,
      faceValue = 1
    ): void => {
      const pipPositions = dicePipPattern[faceValue] ?? dicePipPattern[1];

      s.push();
      s.rotateX(rotX);
      s.rotateY(rotY);
      s.rotateZ(rotZ);
      s.translate(0, 0, diceSize / 2 + 0.3);
      pipPositions.forEach(([offsetX, offsetY]) => {
        s.push();
        s.translate(offsetX * pipGap, offsetY * pipGap, 0);
        s.scale(1, 1, pipThickness);
        s.noStroke();
        s.fill(0);
        s.specularMaterial(10);
        s.shininess(40);
        s.sphere(pipRadius, 20, 16);
        s.pop();
      });
      s.pop();
    };

    s.push();
    s.noStroke();
    const faceFill = isHovered ? 80 : 35;
    s.fill(faceFill);
    drawFacePips(0, 0, 0, orientation.top);
    drawFacePips(180, 0, 0, orientation.bottom);
    drawFacePips(-90, 0, 0, orientation.front);
    drawFacePips(90, 0, 0, orientation.back);
    drawFacePips(0, -90, 0, orientation.left);
    drawFacePips(0, 90, 0, orientation.right);
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

    const BOARD_ROTATION_X = 0;

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

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
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
          bestHoverIndex = row * 8 + col;
        }
      }
    }

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

        const cellIndex = row * 8 + col;
        const orientation = orientationPresets[cellIndex];
        if (!orientation) {
          s.pop();
          continue;
        }

        const isHovered = bestHoverIndex === cellIndex;
        drawDiceForCell(orientation, cellIndex, isHovered);
        s.pop();
      }
    }

    s.pop();
  };

  s.draw = (): void => {
    s.background(18);
    const [lightR, lightG, lightB] = lightColor;
    s.directionalLight(lightR, lightG, lightB, 1, 0, 0);
    s.directionalLight(lightR, lightG, lightB, -1, 0, 0);
    s.directionalLight(lightR, lightG, lightB, 0, 1, 0);
    s.directionalLight(lightR, lightG, lightB, 0, -1, 0);
    s.directionalLight(lightR, lightG, lightB, 0, 0, -1);
    // uncomment to enable mouse orbit control
    // s.orbitControl();
    s.push();
    s.scale(1.5);
    drawGrid();
    s.pop();
  };
};

new p5(sketch);
