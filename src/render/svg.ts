import { normalizedPointToCanvas } from "../model/project";
import {
  CANVAS_SIZE,
  JOINT_IDS,
  type CanvasPoint,
  type JointId,
  type PartId,
  type PictogramProject,
} from "../model/types";

export interface RenderPictogramBodyOptions {
  showJoints?: boolean;
  selectedJoint?: JointId | null;
  idPrefix?: string;
}

export interface RenderSvgDocumentOptions {
  size?: number;
  includeXmlDeclaration?: boolean;
  title?: string;
}

type CanvasJoints = Record<JointId, CanvasPoint>;

const SKELETON_CONNECTIONS: readonly [JointId, JointId][] = [
  ["head", "leftShoulder"],
  ["head", "rightShoulder"],
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftHand"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightHand"],
  ["leftShoulder", "hip"],
  ["rightShoulder", "hip"],
  ["hip", "leftKnee"],
  ["leftKnee", "leftFoot"],
  ["hip", "rightKnee"],
  ["rightKnee", "rightFoot"],
];

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return character;
    }
  });
}

function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function toCanvasJoints(project: PictogramProject): CanvasJoints {
  return Object.fromEntries(
    JOINT_IDS.map((jointId) => [
      jointId,
      normalizedPointToCanvas(project.joints[jointId]),
    ]),
  ) as unknown as CanvasJoints;
}

function line(
  start: CanvasPoint,
  end: CanvasPoint,
  width: number,
  color: string,
): string {
  return `<line x1="${formatNumber(start.x)}" y1="${formatNumber(start.y)}" x2="${formatNumber(end.x)}" y2="${formatNumber(end.y)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" />`;
}

function renderTorso(joints: CanvasJoints, color: string): string {
  const { leftShoulder, rightShoulder, hip } = joints;
  const shoulderSpan = Math.hypot(
    rightShoulder.x - leftShoulder.x,
    rightShoulder.y - leftShoulder.y,
  );
  const hipHalfWidth = Math.min(44, Math.max(26, shoulderSpan * 0.28));
  const centerX = (leftShoulder.x + rightShoulder.x) / 2;
  const upperY = (leftShoulder.y + rightShoulder.y) / 2 - 8;
  const hipBottomY = Math.min(CANVAS_SIZE, hip.y + 18);
  const path = [
    `M ${formatNumber(leftShoulder.x - 10)} ${formatNumber(leftShoulder.y)}`,
    `Q ${formatNumber(centerX)} ${formatNumber(upperY)} ${formatNumber(rightShoulder.x + 10)} ${formatNumber(rightShoulder.y)}`,
    `L ${formatNumber(hip.x + hipHalfWidth)} ${formatNumber(hipBottomY)}`,
    `Q ${formatNumber(hip.x)} ${formatNumber(hip.y + 28)} ${formatNumber(hip.x - hipHalfWidth)} ${formatNumber(hipBottomY)}`,
    "Z",
  ].join(" ");

  return `<path d="${path}" fill="${color}" />`;
}

function renderPart(
  partId: PartId,
  joints: CanvasJoints,
  color: string,
): string {
  const hipOffset = 31;

  switch (partId) {
    case "head":
      return `<circle cx="${formatNumber(joints.head.x)}" cy="${formatNumber(joints.head.y)}" r="43" fill="${color}" />`;
    case "torso":
      return renderTorso(joints, color);
    case "leftUpperArm":
      return line(joints.leftShoulder, joints.leftElbow, 46, color);
    case "leftLowerArm":
      return line(joints.leftElbow, joints.leftHand, 40, color);
    case "rightUpperArm":
      return line(joints.rightShoulder, joints.rightElbow, 46, color);
    case "rightLowerArm":
      return line(joints.rightElbow, joints.rightHand, 40, color);
    case "leftUpperLeg":
      return line(
        { x: joints.hip.x - hipOffset, y: joints.hip.y },
        joints.leftKnee,
        56,
        color,
      );
    case "leftLowerLeg":
      return line(joints.leftKnee, joints.leftFoot, 48, color);
    case "rightUpperLeg":
      return line(
        { x: joints.hip.x + hipOffset, y: joints.hip.y },
        joints.rightKnee,
        56,
        color,
      );
    case "rightLowerLeg":
      return line(joints.rightKnee, joints.rightFoot, 48, color);
  }
}

function renderEditorOverlay(
  joints: CanvasJoints,
  selectedJoint: JointId | null,
): string {
  const bones = SKELETON_CONNECTIONS.map(([startId, endId]) => {
    const start = joints[startId];
    const end = joints[endId];
    return `<line x1="${formatNumber(start.x)}" y1="${formatNumber(start.y)}" x2="${formatNumber(end.x)}" y2="${formatNumber(end.y)}" />`;
  }).join("");
  const handles = JOINT_IDS.map((jointId) => {
    const point = joints[jointId];
    const selected = jointId === selectedJoint;
    return `<circle data-joint-id="${jointId}" cx="${formatNumber(point.x)}" cy="${formatNumber(point.y)}" r="${selected ? 9 : 7}" fill="white" stroke="${selected ? "#2563eb" : "#0f766e"}" stroke-width="${selected ? 4 : 3}" />`;
  }).join("");

  return `<g data-editor-overlay="true" fill="none" stroke="#0f766e" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke">${bones}</g><g data-joint-handles="true">${handles}</g>`;
}

export function renderPictogramBody(
  project: PictogramProject,
  options: RenderPictogramBodyOptions = {},
): string {
  const joints = toCanvasJoints(project);
  const color = escapeXml(project.color);
  const prefix = escapeXml(options.idPrefix ?? "");
  const parts = project.drawOrder
    .map((partId) => {
      const markup = renderPart(partId, joints, color);
      return `<g id="${prefix}${partId}" data-part-id="${partId}" class="pictogram-part">${markup}</g>`;
    })
    .join("");
  const overlay = options.showJoints
    ? renderEditorOverlay(joints, options.selectedJoint ?? null)
    : "";

  return `<g data-pictogram-body="true">${parts}${overlay}</g>`;
}

export function renderSvgDocument(
  project: PictogramProject,
  options: RenderSvgDocumentOptions = {},
): string {
  const size = options.size ?? project.pngSize;
  if (!Number.isInteger(size) || size < 1 || size > 16384) {
    throw new RangeError("SVG size must be an integer from 1 to 16384.");
  }

  const declaration = options.includeXmlDeclaration
    ? '<?xml version="1.0" encoding="UTF-8"?>\n'
    : "";
  const title = options.title
    ? `<title>${escapeXml(options.title)}</title>`
    : "";

  return `${declaration}<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" role="img">${title}${renderPictogramBody(project)}</svg>`;
}
