import type p5 from "p5";
import { Grid, RollingAnimation } from "./types";
import { DiceController } from "./diceController";
import { InteractionController } from "./interaction";
import { getRotationSequence } from "./orientation";
import { applyRotationTransform, drawDice } from "./diceDrawing";
import {
  BOARD_ROTATION_X,
  BOX_DEPTH,
  CELL_SIZE,
  CELL_SPACING,
  GRID_DIMENSION,
  GRID_SIZE,
  HOVER_THRESHOLD,
} from "./boardLayout";

const drawDiceForCell = (
  s: p5,
  cellIndex: number,
  isHovered: boolean,
  rollingAnimation: RollingAnimation | null,
  diceController: DiceController
): void => {
  const diceSize = CELL_SIZE * 0.8;
  const diceElevation = BOX_DEPTH / 2 + diceSize / 2 + 6;
  const rotationSequence = getRotationSequence(
    diceController.diceOrientations[cellIndex]
  )
    .slice()
    .reverse();
  const isInvalidHighlight = diceController.isCellInvalidHighlight(cellIndex);

  s.push();
  s.translate(0, 0, diceElevation);
  if (rollingAnimation?.cellIndex === cellIndex) {
    const animationProgress = Math.min(rollingAnimation.progress, 1);
    const movementDistance = (CELL_SIZE + CELL_SPACING) * animationProgress;
    let offsetX = 0;
    let offsetY = 0;
    switch (rollingAnimation.rotation) {
      case "left":
        offsetX = -movementDistance;
        break;
      case "right":
        offsetX = movementDistance;
        break;
      case "up":
        offsetY = -movementDistance;
        break;
      case "down":
        offsetY = movementDistance;
        break;
      default:
        break;
    }
    s.translate(offsetX, offsetY, 0);
  }
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

  if (isInvalidHighlight) {
    s.push();
    s.noFill();
    s.stroke(255, 60, 60, 220);
    s.strokeWeight(3);
    s.box(diceSize + 8, diceSize + 8, diceSize + 8);
    s.pop();
  }
  if (isHovered && !isInvalidHighlight) {
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

export const renderGrid = (
  s: p5,
  selectedGrid: Grid | null,
  diceController: DiceController,
  interaction: InteractionController,
  rollingAnimation: RollingAnimation | null
): void => {
  if (!selectedGrid) {
    return;
  }

  s.push();
  s.rotateX(BOARD_ROTATION_X);
  s.translate(-GRID_DIMENSION / 2 + CELL_SIZE / 2, -GRID_DIMENSION / 2 + CELL_SIZE / 2, 0);

  const renderer = (s as p5 & {
    _renderer?: {
      _curCamera?: {
        cameraMatrix?: {
          multiplyPoint(point: p5.Vector): p5.Vector;
        };
      };
      uPMatrix?: {
        multiplyAndNormalizePoint(point: p5.Vector): { x: number; y: number };
      };
    };
  })._renderer;
  const cameraMatrix = renderer?._curCamera?.cameraMatrix;
  const projectionMatrix = renderer?.uPMatrix;
  const canProject = Boolean(cameraMatrix && projectionMatrix);
  const gridOffset = -GRID_DIMENSION / 2 + CELL_SIZE / 2;
  const diceSize = CELL_SIZE * 0.6;
  const diceElevation = BOX_DEPTH / 2 + diceSize / 2 + 6;
  const depthOffset = BOX_DEPTH / 2 + diceElevation;
  const rotationRadians = s.radians(BOARD_ROTATION_X);
  const cosAngle = Math.cos(rotationRadians);
  const sinAngle = Math.sin(rotationRadians);

  const projectCellCenter = (row: number, col: number):
    | { screenX: number; screenY: number }
    | null => {
    if (!canProject || !cameraMatrix || !projectionMatrix) {
      return null;
    }
    const columnOffset = col * (CELL_SIZE + CELL_SPACING);
    const rowOffset = row * (CELL_SIZE + CELL_SPACING);
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
      if (!diceController.diceCellsMask[cellIndex]) {
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

  interaction.setHover(bestHoverIndex);

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = selectedGrid[row][col];
      const isFilled = value === "#";
      s.push();
      const columnOffset = col * (CELL_SIZE + CELL_SPACING);
      const rowOffset = row * (CELL_SIZE + CELL_SPACING);
      s.translate(columnOffset, rowOffset, BOX_DEPTH / 2);

      const filledColor = s.color(70, 130, 180);
      const emptyColor = s.color(240, 248, 255);

      s.fill(isFilled ? filledColor : emptyColor);
      s.stroke(40);
      s.strokeWeight(1);
      s.box(CELL_SIZE, CELL_SIZE, BOX_DEPTH);

      const cellIndex = row * GRID_SIZE + col;
      const shouldRenderDice = diceController.diceCellsMask[cellIndex];
      const isHovered = shouldRenderDice && interaction.hoveredDiceCell === cellIndex;
      if (shouldRenderDice) {
        drawDiceForCell(s, cellIndex, isHovered, rollingAnimation, diceController);
      }
      s.pop();
    }
  }

  s.pop();
};
