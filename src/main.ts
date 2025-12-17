import p5 from "p5";

type Grid = string[];

type SolutionPayload = Grid[];

type RequestedIndexInfo = {
  zeroBasedIndex: number;
  hasSegment: boolean;
  parsedValue: number | null;
};

type DiceRotation = "left" | "up" | "right" | "down";
type RotationAxis = "x" | "y";
type RollingState = {
  cellIndex: number;
  rotation: DiceRotation;
  startTime: number;
};
type RollingAnimation = RollingState & {
  progress: number;
};

const DICE_ROTATIONS: DiceRotation[] = ["left", "up", "right", "down"];

enum Orientation {
  TOP = "TOP",
  NORTH = "NORTH",
  EAST = "EAST",
  BOTTOM = "BOTTOM",
  SOUTH = "SOUTH",
  WEST = "WEST",
}

const ORIENTATION_OPPOSITE: Record<Orientation, Orientation> = {
  [Orientation.TOP]: Orientation.BOTTOM,
  [Orientation.BOTTOM]: Orientation.TOP,
  [Orientation.NORTH]: Orientation.SOUTH,
  [Orientation.SOUTH]: Orientation.NORTH,
  [Orientation.EAST]: Orientation.WEST,
  [Orientation.WEST]: Orientation.EAST,
};

const XY_ORIENTATIONS: Array<[Orientation, Orientation, Orientation]> = [
  [Orientation.EAST, Orientation.NORTH, Orientation.TOP],
  [Orientation.EAST, Orientation.SOUTH, Orientation.BOTTOM],
  [Orientation.EAST, Orientation.TOP, Orientation.SOUTH],
  [Orientation.EAST, Orientation.BOTTOM, Orientation.NORTH],
  [Orientation.WEST, Orientation.NORTH, Orientation.BOTTOM],
  [Orientation.WEST, Orientation.SOUTH, Orientation.TOP],
  [Orientation.WEST, Orientation.TOP, Orientation.NORTH],
  [Orientation.WEST, Orientation.BOTTOM, Orientation.SOUTH],
  [Orientation.NORTH, Orientation.EAST, Orientation.BOTTOM],
  [Orientation.NORTH, Orientation.WEST, Orientation.TOP],
  [Orientation.NORTH, Orientation.TOP, Orientation.EAST],
  [Orientation.NORTH, Orientation.BOTTOM, Orientation.WEST],
  [Orientation.SOUTH, Orientation.EAST, Orientation.TOP],
  [Orientation.SOUTH, Orientation.WEST, Orientation.BOTTOM],
  [Orientation.SOUTH, Orientation.TOP, Orientation.WEST],
  [Orientation.SOUTH, Orientation.BOTTOM, Orientation.EAST],
  [Orientation.TOP, Orientation.EAST, Orientation.NORTH],
  [Orientation.TOP, Orientation.WEST, Orientation.SOUTH],
  [Orientation.TOP, Orientation.NORTH, Orientation.WEST],
  [Orientation.TOP, Orientation.SOUTH, Orientation.EAST],
  [Orientation.BOTTOM, Orientation.EAST, Orientation.SOUTH],
  [Orientation.BOTTOM, Orientation.WEST, Orientation.NORTH],
  [Orientation.BOTTOM, Orientation.NORTH, Orientation.EAST],
  [Orientation.BOTTOM, Orientation.SOUTH, Orientation.WEST],
];

const XY_KEY = (x: Orientation, y: Orientation): string => `${x}|${y}`;

const Z_FROM_XY = new Map<string, Orientation>();
XY_ORIENTATIONS.forEach(([x, y, z]) => {
  Z_FROM_XY.set(XY_KEY(x, y), z);
});

const ROLL_TABLE: Record<DiceRotation, Partial<Record<Orientation, Orientation>>> = {
  up: {
    [Orientation.TOP]: Orientation.NORTH,
    [Orientation.NORTH]: Orientation.BOTTOM,
    [Orientation.BOTTOM]: Orientation.SOUTH,
    [Orientation.SOUTH]: Orientation.TOP,
  },
  down: {
    [Orientation.TOP]: Orientation.SOUTH,
    [Orientation.SOUTH]: Orientation.BOTTOM,
    [Orientation.BOTTOM]: Orientation.NORTH,
    [Orientation.NORTH]: Orientation.TOP,
  },
  right: {
    [Orientation.TOP]: Orientation.EAST,
    [Orientation.EAST]: Orientation.BOTTOM,
    [Orientation.BOTTOM]: Orientation.WEST,
    [Orientation.WEST]: Orientation.TOP,
  },
  left: {
    [Orientation.TOP]: Orientation.WEST,
    [Orientation.WEST]: Orientation.BOTTOM,
    [Orientation.BOTTOM]: Orientation.EAST,
    [Orientation.EAST]: Orientation.TOP,
  },
};

class CubeOrientation {
  constructor(public readonly x: Orientation, public readonly y: Orientation) {
    if (!Z_FROM_XY.has(XY_KEY(x, y))) {
      throw new Error(`Invalid orientation combination: ${x}/${y}`);
    }
  }

  get key(): string {
    return XY_KEY(this.x, this.y);
  }

  get z(): Orientation {
    return Z_FROM_XY.get(this.key)!;
  }

  roll(direction: DiceRotation): CubeOrientation {
    const table = ROLL_TABLE[direction];
    const rotate = (orientation: Orientation): Orientation =>
      table?.[orientation] ?? orientation;
    return new CubeOrientation(rotate(this.x), rotate(this.y));
  }

  static identity(): CubeOrientation {
    return new CubeOrientation(Orientation.EAST, Orientation.NORTH);
  }
}

const DEFAULT_ORIENTATION = CubeOrientation.identity();

const ALL_ORIENTATIONS = XY_ORIENTATIONS.map(
  ([x, y]) => new CubeOrientation(x, y)
);

const ORIENTATION_INDEX_BY_KEY = new Map<string, number>();
ALL_ORIENTATIONS.forEach((orientation, index) => {
  ORIENTATION_INDEX_BY_KEY.set(orientation.key, index);
});

const ORIENTATION_ROTATION_SEQUENCES: DiceRotation[][] = (() => {
  const sequences: DiceRotation[][] = Array.from(
    { length: ALL_ORIENTATIONS.length },
    () => []
  );
  const visited = new Set<string>();
  const queue: Array<{ orientation: CubeOrientation; sequence: DiceRotation[] }> = [
    { orientation: DEFAULT_ORIENTATION, sequence: [] },
  ];
  visited.add(DEFAULT_ORIENTATION.key);

  while (queue.length > 0) {
    const { orientation, sequence } = queue.shift()!;
    const index = ORIENTATION_INDEX_BY_KEY.get(orientation.key);
    if (index !== undefined && sequences[index].length === 0) {
      sequences[index] = sequence;
    }
    for (const rotation of DICE_ROTATIONS) {
      const next = orientation.roll(rotation);
      if (visited.has(next.key)) {
        continue;
      }
      visited.add(next.key);
      queue.push({ orientation: next, sequence: [...sequence, rotation] });
    }
  }

  return sequences;
})();

const getRotationSequence = (orientation: CubeOrientation): DiceRotation[] => {
  const index = ORIENTATION_INDEX_BY_KEY.get(orientation.key);
  if (index === undefined) {
    return [];
  }
  return ORIENTATION_ROTATION_SEQUENCES[index];
};

const ROLL_DURATION_MS = 320;

const rotationAxisAngleMap: Record<DiceRotation, { axis: RotationAxis; angle: number }> = {
  left: { axis: "y", angle: -90 },
  right: { axis: "y", angle: 90 },
  up: { axis: "x", angle: 90 },
  down: { axis: "x", angle: -90 },
};

const applyRotationTransform = (p: p5, rotation: DiceRotation, multiplier = 1): void => {
  const { axis, angle } = rotationAxisAngleMap[rotation];
  const actualAngle = angle * multiplier;
  if (axis === "x") {
    p.rotateX(actualAngle);
  } else {
    p.rotateY(actualAngle);
  }
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
  const HOVER_THRESHOLD = cellSize * 0.8;
  const DRAG_DISTANCE_THRESHOLD = 20;
  let activeDragCell: number | null = null;
  let lastDragPoint: { x: number; y: number } | null = null;
  let dragRotationApplied = false;
  let hoveredDiceCell: number | null = null;
  let rollingState: RollingState | null = null;

  const RANDOM_SEED = 0xdeadbeef;
  let rngState = RANDOM_SEED;
  const seededRandom = (): number => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 0x100000000;
  };
  const randomDiceOrientation = (): CubeOrientation => {
    let orientation = CubeOrientation.identity();
    const rotationCount = 1 + Math.floor(seededRandom() * 3);
    for (let i = 0; i < rotationCount; i += 1) {
      const rotation = DICE_ROTATIONS[Math.floor(seededRandom() * DICE_ROTATIONS.length)];
      orientation = orientation.roll(rotation);
    }
    return orientation;
  };
  const diceCellsMask = Array.from({ length: TOTAL_CELLS }, () => seededRandom() < 0.45);
  if (!diceCellsMask.some(Boolean)) {
    diceCellsMask[0] = true;
  }
  const diceOrientations: CubeOrientation[] = diceCellsMask.map(() => randomDiceOrientation());

  const computeRollingAnimation = (): RollingAnimation | null => {
    if (rollingState === null) {
      return null;
    }
    const elapsed = performance.now() - rollingState.startTime;
    return {
      ...rollingState,
      progress: Math.min(1, elapsed / ROLL_DURATION_MS),
    };
  };

  const startRollingAnimation = (cellIndex: number, rotation: DiceRotation): void => {
    rollingState = {
      cellIndex,
      rotation,
      startTime: performance.now(),
    };
  };

  const finalizeRollingAnimation = (): void => {
    if (rollingState === null) {
      return;
    }
    diceOrientations[rollingState.cellIndex] = diceOrientations[
      rollingState.cellIndex
    ].roll(rollingState.rotation);
    rollingState = null;
  };

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
      [0, 0, 1], // top
      [0, 1, 0], // front
      [1, 0, 0], // right
      [-1, 0, 0], // left
      [0, -1, 0], // back
      [0, 0, -1], // bottom
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
    isHovered: boolean,
    rollingAnimation: RollingAnimation | null
  ): void => {
    const diceSize = cellSize * 0.8;
    const diceElevation = boxDepth / 2 + diceSize / 2 + 6;
    const rotationSequence = getRotationSequence(diceOrientations[cellIndex]).slice().reverse();

    s.push();
    s.translate(0, 0, diceElevation);
    s.ambientMaterial(166, 199, 255);
    s.specularMaterial(255);
    s.stroke(210);
    s.strokeWeight(1);

    s.push();
    if (rollingAnimation?.cellIndex === cellIndex) {
      applyRotationTransform(s, rollingAnimation.rotation, rollingAnimation.progress);
    }
    for (const rotation of rotationSequence) {
      applyRotationTransform(s, rotation);
    }
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

  s.mousePressed = (): void => {
    if (rollingState !== null) {
      return;
    }
    if (hoveredDiceCell !== null && diceCellsMask[hoveredDiceCell]) {
      activeDragCell = hoveredDiceCell;
      lastDragPoint = { x: s.mouseX, y: s.mouseY };
      dragRotationApplied = false;
    }
  };

  s.mouseDragged = (): void => {
    if (rollingState !== null) {
      return;
    }
    if (activeDragCell === null || lastDragPoint === null) {
      return;
    }
    if (dragRotationApplied) {
      return;
    }
    const dx = s.mouseX - lastDragPoint.x;
    const dy = s.mouseY - lastDragPoint.y;
    if (Math.hypot(dx, dy) < DRAG_DISTANCE_THRESHOLD) {
      return;
    }
    const rotation: DiceRotation =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
        ? "down"
        : "up";
    startRollingAnimation(activeDragCell, rotation);
    dragRotationApplied = true;
    lastDragPoint = { x: s.mouseX, y: s.mouseY };
  };

  s.mouseReleased = (): void => {
    activeDragCell = null;
    lastDragPoint = null;
    dragRotationApplied = false;
  };

  const drawGrid = (rollingAnimation: RollingAnimation | null): void => {
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

    let bestHoverIndex: number | null = null;
    let bestHoverDistance = HOVER_THRESHOLD;

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

    hoveredDiceCell = bestHoverIndex;

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
          drawDiceForCell(cellIndex, isHovered, rollingAnimation);
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
    // s.orbitControl();
    const currentRollingAnimation = computeRollingAnimation();
    s.push();
    s.scale(1.5);
    drawGrid(currentRollingAnimation);
    s.pop();
    if (currentRollingAnimation && currentRollingAnimation.progress >= 1) {
      finalizeRollingAnimation();
    }
  };
};

new p5(sketch);
