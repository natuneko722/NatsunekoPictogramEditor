import { describe, expect, it } from "vitest";
import { POSE_PRESETS, applyPosePreset } from "./presets";
import {
  canvasPointToNormalized,
  createProject,
  getLimbDepth,
  mirrorProject,
  movePartToBack,
  movePartToFront,
  normalizedPointToCanvas,
  setLimbDepth,
  setPngExportSize,
  setProjectColor,
  toggleLimbDepth,
  updateJoint,
} from "./project";
import {
  CANVAS_SIZE,
  PART_IDS,
  PROJECT_FORMAT,
  PROJECT_VERSION,
} from "./types";

describe("pose presets", () => {
  it("provides the five MVP poses with Japanese labels", () => {
    expect(POSE_PRESETS.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "standing", label: "立つ" },
      { id: "walking", label: "歩く" },
      { id: "running", label: "走る" },
      { id: "pointing", label: "指差す" },
      { id: "waving", label: "手を振る" },
    ]);
  });

  it("applies a cloned pose without changing other project settings", () => {
    const original = setProjectColor(createProject(), "#123456");
    const changed = applyPosePreset(original, "running");

    expect(changed.color).toBe("#123456");
    expect(changed.joints).toEqual(POSE_PRESETS[2].joints);
    expect(changed.joints).not.toBe(POSE_PRESETS[2].joints);
    expect(original.joints).not.toEqual(changed.joints);
  });
});

describe("pictogram project", () => {
  it("creates a versioned 512-square project", () => {
    const project = createProject();

    expect(project.format).toBe(PROJECT_FORMAT);
    expect(project.schemaVersion).toBe(PROJECT_VERSION);
    expect(project.canvasSize).toBe(CANVAS_SIZE);
    expect(new Set(project.drawOrder)).toEqual(new Set(PART_IDS));
  });

  it("updates only one joint and clamps it inside the canvas", () => {
    const original = createProject();
    const changed = updateJoint(original, "leftHand", { x: -2, y: 1.5 });

    expect(changed.joints.leftHand).toEqual({ x: 0, y: 1 });
    expect(original.joints.leftHand).not.toEqual(changed.joints.leftHand);
    expect(changed.joints.rightHand).toEqual(original.joints.rightHand);
  });

  it("converts normalized and canvas coordinates consistently", () => {
    expect(normalizedPointToCanvas({ x: 0.25, y: 0.75 })).toEqual({
      x: 128,
      y: 384,
    });
    expect(canvasPointToNormalized({ x: 128, y: 384 })).toEqual({
      x: 0.25,
      y: 0.75,
    });
    expect(canvasPointToNormalized({ x: 700, y: -10 })).toEqual({ x: 1, y: 0 });
  });

  it("returns to the exact project after mirroring twice", () => {
    const original = updateJoint(createProject("pointing"), "leftHand", {
      x: 0.123456,
      y: 0.654321,
    });

    expect(mirrorProject(mirrorProject(original))).toEqual(original);
  });

  it("swaps left/right semantics and their draw depth when mirrored", () => {
    const original = setLimbDepth(
      setLimbDepth(createProject(), "leftArm", "front"),
      "rightArm",
      "back",
    );
    const mirrored = mirrorProject(original);

    expect(mirrored.joints.leftHand.x).toBeCloseTo(
      1 - original.joints.rightHand.x,
      6,
    );
    expect(getLimbDepth(mirrored, "rightArm")).toBe("front");
    expect(getLimbDepth(mirrored, "leftArm")).toBe("back");
  });

  it("moves limbs and individual parts without duplicating IDs", () => {
    const project = createProject();
    const front = setLimbDepth(project, "rightLeg", "front");
    const toggled = toggleLimbDepth(front, "rightLeg");
    const moved = movePartToBack(movePartToFront(toggled, "head"), "torso");

    expect(front.drawOrder.slice(-2)).toEqual(["rightUpperLeg", "rightLowerLeg"]);
    expect(getLimbDepth(toggled, "rightLeg")).toBe("back");
    expect(moved.drawOrder[0]).toBe("torso");
    expect(new Set(moved.drawOrder).size).toBe(PART_IDS.length);
  });

  it("reports every limb depth relative to the torso after other limbs move", () => {
    let project = createProject();
    project = setLimbDepth(project, "leftArm", "back");

    expect(getLimbDepth(project, "leftArm")).toBe("back");
    expect(getLimbDepth(project, "rightArm")).toBe("back");
    expect(getLimbDepth(project, "leftLeg")).toBe("front");
    expect(getLimbDepth(project, "rightLeg")).toBe("back");

    project = setLimbDepth(project, "rightLeg", "front");
    expect(getLimbDepth(project, "rightLeg")).toBe("front");
    expect(getLimbDepth(project, "leftLeg")).toBe("front");
  });

  it("keeps the project unchanged when a limb already has the selected depth", () => {
    const project = createProject();
    expect(setLimbDepth(project, "leftArm", "front")).toBe(project);

    const leftArmBack = setLimbDepth(project, "leftArm", "back");
    expect(setLimbDepth(leftArmBack, "leftArm", "back")).toBe(leftArmBack);
  });

  it("rejects unsafe colors and unsupported PNG sizes", () => {
    const project = createProject();

    expect(() => setProjectColor(project, 'red" onload="x')).toThrow(RangeError);
    expect(setProjectColor(project, "#AABBCC").color).toBe("#AABBCC");
    expect(() => setPngExportSize(project, 15)).toThrow(RangeError);
    expect(() => setPngExportSize(project, 4097)).toThrow(RangeError);
    expect(setPngExportSize(project, 2048).pngSize).toBe(2048);
  });
});
