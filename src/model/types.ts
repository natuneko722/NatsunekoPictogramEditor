export const CANVAS_SIZE = 512 as const;

export const PROJECT_FORMAT = "natsuneko-pictogram-project" as const;
export const PROJECT_VERSION = 1 as const;

export const DEFAULT_PNG_EXPORT_SIZE = 1024;
export const MIN_PNG_EXPORT_SIZE = 16;
export const MAX_PNG_EXPORT_SIZE = 4096;
export const PNG_EXPORT_SIZES = [256, 512, 1024, 2048] as const;

export const JOINT_IDS = [
  "head",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftHand",
  "rightHand",
  "hip",
  "leftKnee",
  "rightKnee",
  "leftFoot",
  "rightFoot",
] as const;

export type JointId = (typeof JOINT_IDS)[number];

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export type JointPositions = Record<JointId, NormalizedPoint>;

export const PART_IDS = [
  "head",
  "torso",
  "leftUpperArm",
  "leftLowerArm",
  "rightUpperArm",
  "rightLowerArm",
  "leftUpperLeg",
  "leftLowerLeg",
  "rightUpperLeg",
  "rightLowerLeg",
] as const;

export type PartId = (typeof PART_IDS)[number];

// 配列の先頭が奥、末尾が手前。
export const DEFAULT_DRAW_ORDER: readonly PartId[] = [
  "rightUpperArm",
  "rightLowerArm",
  "rightUpperLeg",
  "rightLowerLeg",
  "torso",
  "leftUpperLeg",
  "leftLowerLeg",
  "leftUpperArm",
  "leftLowerArm",
  "head",
];

export const PRESET_IDS = [
  "standing",
  "walking",
  "running",
  "pointing",
  "waving",
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export interface PosePreset {
  id: PresetId;
  label: string;
  description: string;
  joints: JointPositions;
}

export const LIMB_IDS = ["leftArm", "rightArm", "leftLeg", "rightLeg"] as const;
export type LimbId = (typeof LIMB_IDS)[number];
export type LimbDepth = "front" | "back";

export type PngExportSize = number;

export interface PictogramProject {
  format: typeof PROJECT_FORMAT;
  schemaVersion: typeof PROJECT_VERSION;
  canvasSize: typeof CANVAS_SIZE;
  color: string;
  pngSize: PngExportSize;
  joints: JointPositions;
  drawOrder: PartId[];
}
