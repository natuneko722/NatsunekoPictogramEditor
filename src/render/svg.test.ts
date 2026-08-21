import { describe, expect, it } from "vitest";
import { POSE_PRESETS, applyPosePreset } from "../model/presets";
import { createProject, setLimbDepth, setProjectColor } from "../model/project";
import { JOINT_IDS, PART_IDS } from "../model/types";
import { renderPngBlob } from "./png";
import { escapeXml, renderPictogramBody, renderSvgDocument } from "./svg";

describe("SVG renderer", () => {
  it("renders every stable part ID exactly once in draw order", () => {
    const project = setLimbDepth(createProject(), "rightArm", "front");
    const body = renderPictogramBody(project);

    for (const partId of PART_IDS) {
      expect(body.match(new RegExp(`data-part-id="${partId}"`, "g"))).toHaveLength(1);
    }

    const indexes = project.drawOrder.map((partId) =>
      body.indexOf(`data-part-id="${partId}"`),
    );
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
  });

  it("uses the project color and renders no opaque background", () => {
    const svg = renderSvgDocument(setProjectColor(createProject(), "#FF00AA"));

    expect(svg).toContain('fill="#FF00AA"');
    expect(svg).not.toContain("<rect");
    expect(svg).not.toContain("background");
  });

  it("creates a complete 512-viewBox document at the requested output size", () => {
    const svg = renderSvgDocument(createProject(), {
      size: 2048,
      includeXmlDeclaration: true,
      title: "夏猫式ピクトグラム",
    });

    expect(svg.startsWith("<?xml")).toBe(true);
    expect(svg).toContain('width="2048" height="2048"');
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain("<title>夏猫式ピクトグラム</title>");
  });

  it("escapes XML text and optional ID prefixes", () => {
    expect(escapeXml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&apos;");
    const body = renderPictogramBody(createProject(), { idPrefix: 'a"b&' });
    expect(body).toContain('id="a&quot;b&amp;head"');
    expect(body).not.toContain('id="a"b&head"');
  });

  it("can show all draggable joint handles without exporting them", () => {
    const body = renderPictogramBody(createProject(), {
      showJoints: true,
      selectedJoint: "leftHand",
    });
    const exported = renderSvgDocument(createProject());

    for (const jointId of JOINT_IDS) {
      expect(body).toContain(`data-joint-id="${jointId}"`);
    }
    expect(exported).not.toContain("data-joint-id");
  });

  it("renders all five presets without invalid numbers", () => {
    for (const preset of POSE_PRESETS) {
      const svg = renderSvgDocument(applyPosePreset(createProject(), preset.id));
      expect(svg).not.toContain("NaN");
      expect(svg).not.toContain("Infinity");
    }
  });

  it("requires a browser before rasterizing PNG", async () => {
    await expect(renderPngBlob(createProject())).rejects.toThrow(
      "ブラウザ環境が必要",
    );
  });
});
