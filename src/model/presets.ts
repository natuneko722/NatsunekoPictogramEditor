import type {
  JointPositions,
  PictogramProject,
  PosePreset,
  PresetId,
} from "./types";

const standing: JointPositions = {
  head: { x: 0.5, y: 0.15 },
  leftShoulder: { x: 0.4, y: 0.28 },
  rightShoulder: { x: 0.6, y: 0.28 },
  leftElbow: { x: 0.35, y: 0.44 },
  rightElbow: { x: 0.65, y: 0.44 },
  leftHand: { x: 0.32, y: 0.61 },
  rightHand: { x: 0.68, y: 0.61 },
  hip: { x: 0.5, y: 0.55 },
  leftKnee: { x: 0.43, y: 0.72 },
  rightKnee: { x: 0.57, y: 0.72 },
  leftFoot: { x: 0.41, y: 0.9 },
  rightFoot: { x: 0.59, y: 0.9 },
};

const walking: JointPositions = {
  head: { x: 0.5, y: 0.15 },
  leftShoulder: { x: 0.4, y: 0.28 },
  rightShoulder: { x: 0.6, y: 0.28 },
  leftElbow: { x: 0.44, y: 0.42 },
  rightElbow: { x: 0.67, y: 0.44 },
  leftHand: { x: 0.51, y: 0.53 },
  rightHand: { x: 0.7, y: 0.59 },
  hip: { x: 0.5, y: 0.55 },
  leftKnee: { x: 0.57, y: 0.7 },
  rightKnee: { x: 0.43, y: 0.72 },
  leftFoot: { x: 0.67, y: 0.86 },
  rightFoot: { x: 0.32, y: 0.89 },
};

const running: JointPositions = {
  head: { x: 0.54, y: 0.14 },
  leftShoulder: { x: 0.43, y: 0.28 },
  rightShoulder: { x: 0.62, y: 0.3 },
  leftElbow: { x: 0.36, y: 0.42 },
  rightElbow: { x: 0.69, y: 0.43 },
  leftHand: { x: 0.46, y: 0.45 },
  rightHand: { x: 0.61, y: 0.52 },
  hip: { x: 0.54, y: 0.55 },
  leftKnee: { x: 0.41, y: 0.66 },
  rightKnee: { x: 0.68, y: 0.65 },
  leftFoot: { x: 0.28, y: 0.78 },
  rightFoot: { x: 0.57, y: 0.85 },
};

const pointing: JointPositions = {
  head: { x: 0.48, y: 0.15 },
  leftShoulder: { x: 0.38, y: 0.29 },
  rightShoulder: { x: 0.58, y: 0.29 },
  leftElbow: { x: 0.34, y: 0.45 },
  rightElbow: { x: 0.73, y: 0.3 },
  leftHand: { x: 0.32, y: 0.61 },
  rightHand: { x: 0.9, y: 0.3 },
  hip: { x: 0.48, y: 0.56 },
  leftKnee: { x: 0.42, y: 0.73 },
  rightKnee: { x: 0.55, y: 0.73 },
  leftFoot: { x: 0.4, y: 0.9 },
  rightFoot: { x: 0.57, y: 0.9 },
};

const waving: JointPositions = {
  head: { x: 0.49, y: 0.16 },
  leftShoulder: { x: 0.39, y: 0.29 },
  rightShoulder: { x: 0.59, y: 0.29 },
  leftElbow: { x: 0.34, y: 0.45 },
  rightElbow: { x: 0.7, y: 0.21 },
  leftHand: { x: 0.32, y: 0.61 },
  rightHand: { x: 0.67, y: 0.07 },
  hip: { x: 0.49, y: 0.56 },
  leftKnee: { x: 0.42, y: 0.73 },
  rightKnee: { x: 0.56, y: 0.73 },
  leftFoot: { x: 0.4, y: 0.9 },
  rightFoot: { x: 0.58, y: 0.9 },
};

export const POSE_PRESETS: readonly PosePreset[] = [
  {
    id: "standing",
    label: "立つ",
    description: "正面を向いてまっすぐ立つ基本姿勢",
    joints: standing,
  },
  {
    id: "walking",
    label: "歩く",
    description: "腕と脚を交互に前へ出した歩行姿勢",
    joints: walking,
  },
  {
    id: "running",
    label: "走る",
    description: "上体を傾けて地面を蹴る走行姿勢",
    joints: running,
  },
  {
    id: "pointing",
    label: "指差す",
    description: "右腕を横へ伸ばして方向を示す姿勢",
    joints: pointing,
  },
  {
    id: "waving",
    label: "手を振る",
    description: "右手を上げてあいさつする姿勢",
    joints: waving,
  },
] as const;

export function getPosePreset(id: PresetId): PosePreset {
  const preset = POSE_PRESETS.find((candidate) => candidate.id === id);

  if (!preset) {
    throw new RangeError(`Unknown pose preset: ${id}`);
  }

  return preset;
}

export function cloneJointPositions(joints: JointPositions): JointPositions {
  return {
    head: { ...joints.head },
    leftShoulder: { ...joints.leftShoulder },
    rightShoulder: { ...joints.rightShoulder },
    leftElbow: { ...joints.leftElbow },
    rightElbow: { ...joints.rightElbow },
    leftHand: { ...joints.leftHand },
    rightHand: { ...joints.rightHand },
    hip: { ...joints.hip },
    leftKnee: { ...joints.leftKnee },
    rightKnee: { ...joints.rightKnee },
    leftFoot: { ...joints.leftFoot },
    rightFoot: { ...joints.rightFoot },
  };
}

export function applyPosePreset(
  project: PictogramProject,
  id: PresetId,
): PictogramProject {
  return {
    ...project,
    joints: cloneJointPositions(getPosePreset(id).joints),
  };
}
