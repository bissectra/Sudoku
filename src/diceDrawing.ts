import type p5 from "p5";
import type { DiceRotation, RotationAxis } from "./types";

const rotationAxisAngleMap: Record<DiceRotation, { axis: RotationAxis; angle: number }> = {
  left: { axis: "y", angle: -90 },
  right: { axis: "y", angle: 90 },
  up: { axis: "x", angle: 90 },
  down: { axis: "x", angle: -90 },
};

export const applyRotationTransform = (p: p5, rotation: DiceRotation, multiplier = 1): void => {
  const { axis, angle } = rotationAxisAngleMap[rotation];
  const actualAngle = angle * multiplier;
  if (axis === "x") {
    p.rotateX(actualAngle);
  } else {
    p.rotateY(actualAngle);
  }
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

export const drawDice = (s: p5): void => {
  s.noStroke();
  s.fill(255);
  s.ambientMaterial(235, 232, 220);
  s.specularMaterial(250);
  s.shininess(20);
  s.box(1);

  const pipRadius = 0.15;
  const faceOffset = 0.5;
  const pipOffset = 0.2;
  const faceValues = [1, 2, 3, 4, 5, 6];
  const faceNormals = [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
  ];

  for (let i = 0; i < faceValues.length; i += 1) {
    const faceValue = faceValues[i];
    const normal = faceNormals[i];
    const pips = dicePipPattern[faceValue];

    s.push();
    s.translate(
      normal[0] * faceOffset,
      normal[1] * faceOffset,
      normal[2] * faceOffset
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
      s.ambientMaterial(40, 40, 40);
      s.shininess(10);
      s.noStroke();
      s.ellipse(0, 0, pipRadius, pipRadius);
      s.pop();
    }

    s.pop();
  }
};
