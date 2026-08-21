import { describe, expect, it } from "vitest";
import { createProject, updateJoint } from "../model/project";
import { PART_IDS } from "../model/types";
import {
  ProjectValidationError,
  parseProjectJson,
  readProjectFile,
  serializeProject,
  validateProjectData,
} from "./projectFile";

describe("project JSON", () => {
  it("round-trips every editable project setting", () => {
    const project = {
      ...updateJoint(createProject("waving"), "rightHand", { x: 0.81, y: 0.02 }),
      color: "#ABCDEF",
      pngSize: 2048,
      drawOrder: [...PART_IDS].reverse(),
    };

    expect(parseProjectJson(serializeProject(project))).toEqual(project);
  });

  it("does not expose references from the parsed source object", () => {
    const source = createProject();
    const result = validateProjectData(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    result.data.joints.head.x = 0;
    result.data.drawOrder.reverse();
    expect(source.joints.head.x).not.toBe(0);
    expect(source.drawOrder).not.toEqual(result.data.drawOrder);
  });

  it("rejects malformed JSON with a typed validation error", () => {
    expect(() => parseProjectJson("{not-json}")).toThrowError(ProjectValidationError);
  });

  it("rejects unsupported versions before replacing editor state", () => {
    const source = { ...createProject(), schemaVersion: 2 };
    const result = validateProjectData(source);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.join(" ")).toContain("schemaVersion 2");
  });

  it("reports unsafe color, off-canvas joints and duplicate draw parts", () => {
    const source = createProject();
    const result = validateProjectData({
      ...source,
      color: '<script>alert("x")</script>',
      joints: {
        ...source.joints,
        leftFoot: { x: -1, y: 4 },
      },
      drawOrder: source.drawOrder.map(() => "head"),
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toHaveLength(3);
    expect(result.errors.join(" ")).toContain("color");
    expect(result.errors.join(" ")).toContain("leftFoot");
    expect(result.errors.join(" ")).toContain("重複なく");
  });

  it("rejects missing joints and non-finite numbers", () => {
    const source = createProject();
    const { head: _head, ...withoutHead } = source.joints;
    const result = validateProjectData({
      ...source,
      joints: {
        ...withoutHead,
        rightFoot: { x: Number.NaN, y: 0.5 },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.join(" ")).toContain("head");
    expect(result.errors.join(" ")).toContain("rightFoot");
  });

  it("rejects oversized files before reading their contents", async () => {
    let textWasRead = false;

    await expect(
      readProjectFile({
        size: 1_000_001,
        text: async () => {
          textWasRead = true;
          return serializeProject(createProject());
        },
      }),
    ).rejects.toThrow("1MB以下");

    expect(textWasRead).toBe(false);
  });
});
