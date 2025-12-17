import p5 from "p5";
import { Grid } from "./types";
import { DiceController } from "./diceController";
import { renderGrid } from "./gridRenderer";
import { loadSolutions } from "./solutionService";
import { InteractionController } from "./interaction";
import { LIGHT_COLOR, GRID_SIZE, DRAG_DISTANCE_THRESHOLD } from "./boardLayout";

  const sketch = (s: p5): void => {
    let goalGrid: Grid | null = null;
  let solutionLabel = "Loading…";
  const refreshInfoLabel = (): void => {
    const infoEl = document.getElementById("info");
    if (infoEl) {
      infoEl.textContent = solutionLabel;
    }
  };
  refreshInfoLabel();

  const diceController = new DiceController(GRID_SIZE);
  const logInitialDiceTopFaces = (grid: Grid): void => {
    const topFaceValues = diceController.getTopFaceValues();
    const rows: string[] = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      const rowValues: string[] = [];
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (grid[row][col] !== "#") {
          rowValues.push(".");
          continue;
        }
        const cellIndex = row * GRID_SIZE + col;
        const topValue = topFaceValues[cellIndex];
        rowValues.push(topValue !== null && topValue !== undefined ? `${topValue}` : "?");
      }
      rows.push(rowValues.join(" "));
    }
    console.log("Initial dice top faces:\n" + rows.join("\n"));
  };
  const interaction = new InteractionController(DRAG_DISTANCE_THRESHOLD);
  const lightColor = LIGHT_COLOR;

  const loadAndSelectSolution = async (): Promise<void> => {
    const result = await loadSolutions();
    if (result.goalGrid) {
      goalGrid = result.goalGrid;
    }
    if (result.startGrid) {
      diceController.setDiceMaskFromGrid(result.startGrid);
      logInitialDiceTopFaces(result.startGrid);
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
    const hoverCell = interaction.hoveredDiceCell;
    if (hoverCell !== null && diceController.diceCellsMask[hoverCell]) {
      interaction.startDrag(hoverCell, { x: s.mouseX, y: s.mouseY });
    }
  };

  s.mouseDragged = (): void => {
    if (diceController.getRollingState() !== null) {
      return;
    }
    const move = interaction.recordMovement({ x: s.mouseX, y: s.mouseY });
    if (move !== null) {
      diceController.startRollingAnimation(move.cellIndex, move.rotation);
    }
  };

  s.mouseReleased = (): void => {
    interaction.resetDrag();
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

    diceController.processFrame();
    const currentRollingAnimation = diceController.computeRollingAnimation();
    s.push();
    s.scale(1.5);
    renderGrid(s, goalGrid, diceController, interaction, currentRollingAnimation);
    s.pop();
    if (currentRollingAnimation && currentRollingAnimation.progress >= 1) {
      diceController.finalizeRollingAnimation();
    }
  };
};

new p5(sketch);
