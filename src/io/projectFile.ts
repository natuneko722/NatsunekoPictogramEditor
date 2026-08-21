import { clampNormalizedPoint, isHexColor, isValidPngExportSize } from "../model/project";
import {
  CANVAS_SIZE,
  JOINT_IDS,
  PART_IDS,
  PROJECT_FORMAT,
  PROJECT_VERSION,
  type JointId,
  type JointPositions,
  type PartId,
  type PictogramProject,
} from "../model/types";

export const PROJECT_FILE_EXTENSION = ".neko-pict.json";
export const PROJECT_MIME_TYPE = "application/json";
export const MAX_PROJECT_FILE_SIZE = 1_000_000;

export type ProjectValidationResult =
  | { success: true; data: PictogramProject }
  | { success: false; errors: string[] };

export class ProjectValidationError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(errors.join("\n"));
    this.name = "ProjectValidationError";
    this.errors = [...errors];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateJoints(
  value: unknown,
  errors: string[],
): JointPositions | null {
  if (!isRecord(value)) {
    errors.push("joints はオブジェクトである必要があります。");
    return null;
  }

  const result = {} as JointPositions;

  for (const jointId of JOINT_IDS) {
    const point = value[jointId];
    if (!isRecord(point)) {
      errors.push(`joints.${jointId} がありません。`);
      continue;
    }

    const { x, y } = point;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      errors.push(`joints.${jointId} の x と y は有限の数値である必要があります。`);
      continue;
    }

    if (x < 0 || x > 1 || y < 0 || y > 1) {
      errors.push(`joints.${jointId} はキャンバス内（0〜1）である必要があります。`);
      continue;
    }

    result[jointId] = clampNormalizedPoint({ x, y });
  }

  return JOINT_IDS.every((jointId) => result[jointId] !== undefined)
    ? result
    : null;
}

function validateDrawOrder(
  value: unknown,
  errors: string[],
): PartId[] | null {
  if (!Array.isArray(value)) {
    errors.push("drawOrder は配列である必要があります。");
    return null;
  }

  const allowed = new Set<string>(PART_IDS);
  const allStrings = value.every((partId) => typeof partId === "string");
  if (!allStrings || value.some((partId) => !allowed.has(partId as string))) {
    errors.push("drawOrder に未対応のパーツIDが含まれています。");
    return null;
  }

  const unique = new Set(value as string[]);
  if (value.length !== PART_IDS.length || unique.size !== PART_IDS.length) {
    errors.push("drawOrder には全パーツを重複なく1回ずつ指定してください。");
    return null;
  }

  return [...value] as PartId[];
}

export function validateProjectData(value: unknown): ProjectValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      success: false,
      errors: ["プロジェクトのルートはオブジェクトである必要があります。"],
    };
  }

  if (value.format !== PROJECT_FORMAT) {
    errors.push(`format は ${PROJECT_FORMAT} である必要があります。`);
  }

  if (value.schemaVersion !== PROJECT_VERSION) {
    errors.push(
      `schemaVersion ${String(value.schemaVersion)} には対応していません。`,
    );
  }

  if (value.canvasSize !== CANVAS_SIZE) {
    errors.push(`canvasSize は ${CANVAS_SIZE} である必要があります。`);
  }

  if (typeof value.color !== "string" || !isHexColor(value.color)) {
    errors.push("color は #RRGGBB または #RRGGBBAA 形式である必要があります。");
  }

  if (
    typeof value.pngSize !== "number" ||
    !isValidPngExportSize(value.pngSize)
  ) {
    errors.push("pngSize は対応範囲内の整数である必要があります。");
  }

  const joints = validateJoints(value.joints, errors);
  const drawOrder = validateDrawOrder(value.drawOrder, errors);

  if (errors.length > 0 || !joints || !drawOrder) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      format: PROJECT_FORMAT,
      schemaVersion: PROJECT_VERSION,
      canvasSize: CANVAS_SIZE,
      color: value.color as string,
      pngSize: value.pngSize as number,
      joints,
      drawOrder,
    },
  };
}

export function serializeProject(project: PictogramProject): string {
  const validation = validateProjectData(project);
  if (!validation.success) {
    throw new ProjectValidationError(validation.errors);
  }

  return `${JSON.stringify(validation.data, null, 2)}\n`;
}

export function parseProjectJson(source: string): PictogramProject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    throw new ProjectValidationError(["JSONの構文を読み取れませんでした。"]);
  }

  const validation = validateProjectData(parsed);
  if (!validation.success) {
    throw new ProjectValidationError(validation.errors);
  }

  return validation.data;
}

export async function readProjectFile(
  file: Pick<File, "text"> & Partial<Pick<File, "size">>,
): Promise<PictogramProject> {
  if (
    typeof file.size === "number" &&
    file.size > MAX_PROJECT_FILE_SIZE
  ) {
    throw new ProjectValidationError([
      "ファイルが大きすぎます。1MB以下の編集用JSONを選んでください。",
    ]);
  }
  return parseProjectJson(await file.text());
}

export function createProjectBlob(project: PictogramProject): Blob {
  return new Blob([serializeProject(project)], {
    type: `${PROJECT_MIME_TYPE};charset=utf-8`,
  });
}

export function isJointId(value: string): value is JointId {
  return (JOINT_IDS as readonly string[]).includes(value);
}
