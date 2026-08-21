import { cloneJointPositions, getPosePreset } from "./presets";
import {
  CANVAS_SIZE,
  DEFAULT_DRAW_ORDER,
  DEFAULT_PNG_EXPORT_SIZE,
  MAX_PNG_EXPORT_SIZE,
  MIN_PNG_EXPORT_SIZE,
  PROJECT_FORMAT,
  PROJECT_VERSION,
  type CanvasPoint,
  type JointId,
  type LimbDepth,
  type LimbId,
  type NormalizedPoint,
  type PartId,
  type PictogramProject,
  type PngExportSize,
  type PresetId,
} from "./types";

const NORMALIZED_PRECISION = 1_000_000;

const limbParts: Record<LimbId, readonly [PartId, PartId]> = {
  leftArm: ["leftUpperArm", "leftLowerArm"],
  rightArm: ["rightUpperArm", "rightLowerArm"],
  leftLeg: ["leftUpperLeg", "leftLowerLeg"],
  rightLeg: ["rightUpperLeg", "rightLowerLeg"],
};

const mirroredJoint: Record<JointId, JointId> = {
  head: "head",
  leftShoulder: "rightShoulder",
  rightShoulder: "leftShoulder",
  leftElbow: "rightElbow",
  rightElbow: "leftElbow",
  leftHand: "rightHand",
  rightHand: "leftHand",
  hip: "hip",
  leftKnee: "rightKnee",
  rightKnee: "leftKnee",
  leftFoot: "rightFoot",
  rightFoot: "leftFoot",
};

const mirroredPart: Record<PartId, PartId> = {
  head: "head",
  torso: "torso",
  leftUpperArm: "rightUpperArm",
  leftLowerArm: "rightLowerArm",
  rightUpperArm: "leftUpperArm",
  rightLowerArm: "leftLowerArm",
  leftUpperLeg: "rightUpperLeg",
  leftLowerLeg: "rightLowerLeg",
  rightUpperLeg: "leftUpperLeg",
  rightLowerLeg: "leftLowerLeg",
};

export function createProject(presetId: PresetId = "standing"): PictogramProject {
  return {
    format: PROJECT_FORMAT,
    schemaVersion: PROJECT_VERSION,
    canvasSize: CANVAS_SIZE,
    color: "#172033",
    pngSize: DEFAULT_PNG_EXPORT_SIZE,
    joints: cloneJointPositions(getPosePreset(presetId).joints),
    drawOrder: [...DEFAULT_DRAW_ORDER],
  };
}

export function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const clamped = Math.min(1, Math.max(0, value));
  return Math.round(clamped * NORMALIZED_PRECISION) / NORMALIZED_PRECISION;
}

export function clampNormalizedPoint(point: NormalizedPoint): NormalizedPoint {
  return {
    x: clampNormalized(point.x),
    y: clampNormalized(point.y),
  };
}

export function canvasPointToNormalized(point: CanvasPoint): NormalizedPoint {
  return clampNormalizedPoint({
    x: point.x / CANVAS_SIZE,
    y: point.y / CANVAS_SIZE,
  });
}

export function normalizedPointToCanvas(point: NormalizedPoint): CanvasPoint {
  return {
    x: clampNormalized(point.x) * CANVAS_SIZE,
    y: clampNormalized(point.y) * CANVAS_SIZE,
  };
}

export function updateJoint(
  project: PictogramProject,
  jointId: JointId,
  point: NormalizedPoint,
): PictogramProject {
  return {
    ...project,
    joints: {
      ...project.joints,
      [jointId]: clampNormalizedPoint(point),
    },
  };
}

export function mirrorProject(project: PictogramProject): PictogramProject {
  const joints = { ...project.joints };

  (Object.keys(mirroredJoint) as JointId[]).forEach((jointId) => {
    const source = project.joints[mirroredJoint[jointId]];
    joints[jointId] = {
      x: clampNormalized(1 - source.x),
      y: clampNormalized(source.y),
    };
  });

  return {
    ...project,
    joints,
    drawOrder: project.drawOrder.map((partId) => mirroredPart[partId]),
  };
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(value);
}

export function setProjectColor(
  project: PictogramProject,
  color: string,
): PictogramProject {
  if (!isHexColor(color)) {
    throw new RangeError("Color must be #RRGGBB or #RRGGBBAA.");
  }

  return { ...project, color };
}

export function isValidPngExportSize(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_PNG_EXPORT_SIZE &&
    value <= MAX_PNG_EXPORT_SIZE
  );
}

export function setPngExportSize(
  project: PictogramProject,
  pngSize: PngExportSize,
): PictogramProject {
  if (!isValidPngExportSize(pngSize)) {
    throw new RangeError(
      `PNG size must be an integer from ${MIN_PNG_EXPORT_SIZE} to ${MAX_PNG_EXPORT_SIZE}.`,
    );
  }

  return { ...project, pngSize };
}

export function movePartToFront(
  project: PictogramProject,
  partId: PartId,
): PictogramProject {
  return {
    ...project,
    drawOrder: [
      ...project.drawOrder.filter((candidate) => candidate !== partId),
      partId,
    ],
  };
}

export function movePartToBack(
  project: PictogramProject,
  partId: PartId,
): PictogramProject {
  return {
    ...project,
    drawOrder: [
      partId,
      ...project.drawOrder.filter((candidate) => candidate !== partId),
    ],
  };
}

export function setLimbDepth(
  project: PictogramProject,
  limbId: LimbId,
  depth: LimbDepth,
): PictogramProject {
  if (getLimbDepth(project, limbId) === depth) {
    return project;
  }

  const parts = limbParts[limbId];
  const withoutLimb = project.drawOrder.filter(
    (partId) => !parts.includes(partId),
  );

  return {
    ...project,
    drawOrder:
      depth === "front"
        ? [...withoutLimb, ...parts]
        : [...parts, ...withoutLimb],
  };
}

export function getLimbDepth(
  project: PictogramProject,
  limbId: LimbId,
): LimbDepth {
  const indexes = limbParts[limbId].map((partId) =>
    project.drawOrder.indexOf(partId),
  );
  const torsoIndex = project.drawOrder.indexOf("torso");
  return indexes.every((index) => index > torsoIndex) ? "front" : "back";
}

export function toggleLimbDepth(
  project: PictogramProject,
  limbId: LimbId,
): PictogramProject {
  return setLimbDepth(
    project,
    limbId,
    getLimbDepth(project, limbId) === "front" ? "back" : "front",
  );
}
