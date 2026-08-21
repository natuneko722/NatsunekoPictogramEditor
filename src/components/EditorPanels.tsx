import { useEffect, useState } from "react";
import {
  MAX_PNG_EXPORT_SIZE,
  MIN_PNG_EXPORT_SIZE,
  POSE_PRESETS,
  getLimbDepth,
  type LimbDepth,
  type LimbId,
  type PictogramProject,
  type PresetId,
} from "../model";

interface PosePanelProps {
  activePreset: PresetId | null;
  onChoosePreset: (presetId: PresetId) => void;
}

export function PosePanel({ activePreset, onChoosePreset }: PosePanelProps) {
  return (
    <aside className="panel side-panel pose-panel" aria-labelledby="pose-title">
      <h2 className="panel-title" id="pose-title">
        1. 基本ポーズ
      </h2>
      <p className="panel-lead">近い姿勢を選んでから、中央の点を動かします。</p>
      <div className="preset-list">
        {POSE_PRESETS.map((preset, index) => {
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              className={`preset-button${isActive ? " is-active" : ""}`}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChoosePreset(preset.id)}
            >
              <span className="preset-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="preset-copy">
                <strong>{preset.label}</strong>
                <small>{preset.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

const LIMBS: readonly { id: LimbId; label: string }[] = [
  { id: "leftArm", label: "左腕" },
  { id: "rightArm", label: "右腕" },
  { id: "leftLeg", label: "左脚" },
  { id: "rightLeg", label: "右脚" },
];

const QUICK_COLORS = [
  { color: "#172033", label: "濃紺" },
  { color: "#111111", label: "黒" },
  { color: "#156A65", label: "青緑" },
  { color: "#C74B38", label: "赤" },
  { color: "#E98242", label: "橙" },
  { color: "#4F46E5", label: "紫" },
] as const;

interface SettingsPanelProps {
  project: PictogramProject;
  onColorChange: (color: string) => void;
  onMirror: () => void;
  onSetLimbDepth: (limbId: LimbId, depth: LimbDepth) => void;
  onPngSizeChange: (size: number) => void;
  onPngSizeError: (message: string) => void;
}

export function SettingsPanel({
  project,
  onColorChange,
  onMirror,
  onSetLimbDepth,
  onPngSizeChange,
  onPngSizeError,
}: SettingsPanelProps) {
  const [pngSizeDraft, setPngSizeDraft] = useState(String(project.pngSize));

  useEffect(() => setPngSizeDraft(String(project.pngSize)), [project.pngSize]);

  const commitPngSize = () => {
    const parsed = Number(pngSizeDraft);
    if (
      !Number.isInteger(parsed) ||
      parsed < MIN_PNG_EXPORT_SIZE ||
      parsed > MAX_PNG_EXPORT_SIZE
    ) {
      setPngSizeDraft(String(project.pngSize));
      onPngSizeError(
        `PNGサイズは${MIN_PNG_EXPORT_SIZE}〜${MAX_PNG_EXPORT_SIZE}pxの整数で入力してください。`,
      );
      return;
    }
    onPngSizeChange(parsed);
  };

  return (
    <aside
      className="panel side-panel settings-panel"
      aria-labelledby="settings-title"
    >
      <h2 className="panel-title" id="settings-title">
        3. 見た目・書き出し
      </h2>
      <p className="panel-lead">色と重なり順、PNGの大きさを調整します。</p>

      <div className="settings-stack">
        <section className="setting-group">
          <label className="setting-label" htmlFor="person-color">
            人物の色
          </label>
          <div className="color-control">
            <input
              id="person-color"
              type="color"
              value={project.color.slice(0, 7)}
              aria-label="人物の色を選ぶ"
              onChange={(event) => onColorChange(event.target.value)}
            />
            <output className="color-value" htmlFor="person-color">
              {project.color.slice(0, 7)}
            </output>
          </div>
          <div className="quick-color-list" aria-label="すぐ選べる人物色">
            {QUICK_COLORS.map(({ color, label }) => {
              const isSelected = project.color.slice(0, 7).toUpperCase() === color;
              return (
                <button
                  key={color}
                  className={`quick-color-button${isSelected ? " is-active" : ""}`}
                  type="button"
                  aria-label={`${label}（${color}）`}
                  aria-pressed={isSelected}
                  onClick={() => onColorChange(color)}
                >
                  <span
                    className="quick-color-chip"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="setting-group">
          <span className="setting-label">向き</span>
          <button className="panel-button" type="button" onClick={onMirror}>
            ↔ 左右を反転
          </button>
          <p className="setting-note">ポーズと手足の重なり順をまとめて反転します。</p>
        </section>

        <section className="setting-group">
          <span className="setting-label">手足の前後関係</span>
          <div className="limb-controls">
            {LIMBS.map((limb) => {
              const depth = getLimbDepth(project, limb.id);
              return (
                <div className="limb-row" key={limb.id}>
                  <span className="limb-name">{limb.label}</span>
                  <div
                    className="depth-segment"
                    role="group"
                    aria-label={`${limb.label}の前後関係`}
                  >
                    {(["back", "front"] as const).map((candidate) => (
                      <button
                        key={candidate}
                        className={`segment-button${
                          depth === candidate ? " is-active" : ""
                        }`}
                        type="button"
                        aria-label={`${limb.label}を${
                          candidate === "back" ? "奥" : "手前"
                        }にする`}
                        aria-pressed={depth === candidate}
                        onClick={() => {
                          if (depth !== candidate) {
                            onSetLimbDepth(limb.id, candidate);
                          }
                        }}
                      >
                        {candidate === "back" ? "奥" : "手前"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="setting-group">
          <label className="setting-label" htmlFor="png-size">
            PNGサイズ
          </label>
          <div className="number-input-wrap">
            <input
              id="png-size"
              type="number"
              inputMode="numeric"
              min={MIN_PNG_EXPORT_SIZE}
              max={MAX_PNG_EXPORT_SIZE}
              step="1"
              value={pngSizeDraft}
              onChange={(event) => setPngSizeDraft(event.target.value)}
              onBlur={commitPngSize}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setPngSizeDraft(String(project.pngSize));
                  event.currentTarget.blur();
                }
              }}
            />
            <span aria-hidden="true">px</span>
          </div>
          <p className="setting-note">
            {MIN_PNG_EXPORT_SIZE}〜{MAX_PNG_EXPORT_SIZE}px。背景は透明です。
          </p>
        </section>
      </div>
    </aside>
  );
}
