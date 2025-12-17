import p5 from "p5";
import {
  DiceRotation,
  Grid,
  RollingAnimation,
} from "./types";
import { getRotationSequence } from "./orientation";
import { applyRotationTransform, drawDice } from "./diceDrawing";
import { parseRequestedIndex } from "./request";
import { DiceController } from "./diceController";
import {
  BOARD_ROTATION_X,
  BOX_DEPTH,
  CELL_SIZE,
  CELL_SPACING,
  GRID_DIMENSION,
  GRID_SIZE,
  HOVER_THRESHOLD,
  LIGHT_COLOR,
  DRAG_DISTANCE_THRESHOLD,
} from "./boardLayout";
import { loadSolutions } from "./solutionService";

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

const sketch = (s: p5): void => {
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
  const diceController = new DiceController(GRID_SIZE);
  const diceCellsMask = diceController.diceCellsMask;
  const cellSize = CELL_SIZE;
  const cellSpacing = CELL_SPACING;
  const boxDepth = BOX_DEPTH;
  const gridDimension = GRID_DIMENSION;
  const lightColor = LIGHT_COLOR;
  const hoverThreshold = HOVER_THRESHOLD;
  const dragDistanceThreshold = DRAG_DISTANCE_THRESHOLD;
  let activeDragCell: number | null = null;
  let lastDragPoint: { x: number; y: number } | null = null;
  let dragRotationApplied = false;
  let hoveredDiceCell: number | null = null;

  const drawDiceForCell = (
    cellIndex: number,
    isHovered: boolean,
    rollingAnimation: RollingAnimation | null
  ): void => {
    const diceSize = cellSize * 0.8;
    const diceElevation = boxDepth / 2 + diceSize / 2 + 6;
    const rotationSequence = getRotationSequence(
      diceController.diceOrientations[cellIndex]
    )
      .slice()
      .reverse();

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
    drawDice(s);
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

  const drawGrid = (rollingAnimation: RollingAnimation | null): void => {
    if (!selectedGrid) {
      return;
    }

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

    hoveredDiceCell = bestHoverIndex;

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const value = selectedGrid[row][col];
        const isFilled = value === "#";

        s.push();
        const columnOffset = col * (cellSize + cellSpacing);
        const rowOffset = row * (cellSize + cellSpacing);
        s.translate(columnOffset, rowOffset, boxDepth / 2);

        const filledColor = s.color(70, 130, 180);
        const emptyColor = s.color(240, 248, 255);

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

  const loadAndSelectSolution = async (): Promise<void> => {
    const result = await loadSolutions(requested);
    if (result.redirectTo) {
      if (window.location.pathname !== result.redirectTo) {
        window.location.replace(result.redirectTo);
      }
      return;
    }
    if (result.grid) {
      selectedGrid = result.grid;
    }
    solutionLabel = result.label || solutionLabel;
    refreshInfoLabel();
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
    loadAndSelectSolution();
  };

  s.windowResized = (): void => {
    s.resizeCanvas(window.innerWidth, window.innerHeight);
  };

  s.mousePressed = (): void => {
    if (diceController.getRollingState() !== null) {
      return;
    }
    if (hoveredDiceCell !== null && diceCellsMask[hoveredDiceCell]) {
      activeDragCell = hoveredDiceCell;
      lastDragPoint = { x: s.mouseX, y: s.mouseY };
      dragRotationApplied = false;
    }
  };

  s.mouseDragged = (): void => {
    if (diceController.getRollingState() !== null) {
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
    if (Math.hypot(dx, dy) < dragDistanceThreshold) {
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
    diceController.startRollingAnimation(activeDragCell, rotation);
    dragRotationApplied = true;
    lastDragPoint = { x: s.mouseX, y: s.mouseY };
  };

  s.mouseReleased = (): void => {
    activeDragCell = null;
    lastDragPoint = null;
    dragRotationApplied = false;
  };

  s.draw = (): void => {
    s.background(18);
    const [lightR, lightG, lightB] = lightColor;
    const ambientStrength = 0.4;
    s.ambientLight(
      lightR * ambientStrength,
      lightG * ambientStrength,
      lightB * ambientStrength
    );

    s.directionalLight(lightR, lightG, lightB, 1, 0, -1);

    const currentRollingAnimation = diceController.computeRollingAnimation();
    s.push();
    s.scale(1.5);
    drawGrid(currentRollingAnimation);
    s.pop();
    if (currentRollingAnimation && currentRollingAnimation.progress >= 1) {
      diceController.finalizeRollingAnimation();
    }
  };
};

new p5(sketch);
