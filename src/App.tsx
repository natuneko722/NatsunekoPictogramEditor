import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { PosePanel, SettingsPanel } from "./components/EditorPanels";
import { PictogramCanvas, jointLabel } from "./components/PictogramCanvas";
import { PreviewStrip } from "./components/PreviewStrip";
import { Toolbar } from "./components/Toolbar";
import { useEditorHistory } from "./hooks/useEditorHistory";
import {
  applyPosePreset,
  createProject,
  mirrorProject,
  setLimbDepth,
  setPngExportSize,
  setProjectColor,
  updateJoint,
  type JointId,
  type LimbDepth,
  type LimbId,
  type NormalizedPoint,
  type PresetId,
} from "./model";
import {
  ProjectValidationError,
  createProjectBlob,
  readProjectFile,
} from "./io";
import { PngRenderError, renderPngBlob, renderSvgDocument } from "./render";

type StatusKind = "info" | "success" | "error";

interface StatusMessage {
  kind: StatusKind;
  text: string;
}

const DEFAULT_STATUS: StatusMessage = {
  kind: "info",
  text: "基本ポーズを選び、中央のオレンジの点を動かしてみましょう。",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ProjectValidationError) {
    const first = error.errors[0];
    const rest = error.errors.length - 1;
    return `このファイルは読み込めません。${first}${
      rest > 0 ? `（ほか${rest}件）` : ""
    } 夏猫式ピクトグラムエディターで保存した対応JSONを選んでください。`;
  }
  if (error instanceof PngRenderError) {
    return `${error.message} ページを再読み込みして、もう一度お試しください。`;
  }
  return fallback;
}

export default function App() {
  const history = useEditorHistory(createProject());
  const project = history.value;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedJoint, setSelectedJoint] = useState<JointId | null>(null);
  const [activePreset, setActivePreset] = useState<PresetId | null>("standing");
  const [status, setStatus] = useState<StatusMessage>(DEFAULT_STATUS);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const report = useCallback((kind: StatusKind, text: string) => {
    setStatus({ kind, text });
  }, []);

  const handleNew = useCallback(() => {
    if (
      history.isDirty &&
      !window.confirm("未保存の変更があります。新しく作り直してもよいですか？")
    ) {
      return;
    }
    history.reset(createProject(), true);
    setSelectedJoint(null);
    setActivePreset("standing");
    report("success", "新しいピクトグラムを用意しました。");
  }, [history, report]);

  const handleSaveJson = useCallback(() => {
    try {
      downloadBlob(createProjectBlob(project), "natsuneko-pictogram.neko-pict.json");
      history.markSaved();
      report(
        "success",
        "編集用JSONのダウンロードを開始しました。ブラウザのダウンロード一覧で保存結果を確認してください。",
      );
    } catch (error) {
      report(
        "error",
        errorMessage(error, "編集用JSONを保存できませんでした。もう一度お試しください。"),
      );
    }
  }, [history, project, report]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;

      try {
        const loaded = await readProjectFile(file);
        if (
          history.isDirty &&
          !window.confirm(
            "ファイルは正常です。未保存の変更を置き換えて読み込みますか？",
          )
        ) {
          report("info", "読込を取り消しました。現在の編集内容はそのままです。");
          return;
        }
        history.reset(loaded, true);
        setSelectedJoint(null);
        setActivePreset(null);
        report("success", `「${file.name}」を読み込みました。`);
      } catch (error) {
        report(
          "error",
          errorMessage(
            error,
            "ファイルを読み込めませんでした。夏猫式ピクトグラムエディターで保存したJSONか確認してください。",
          ),
        );
      }
    },
    [history, report],
  );

  const handleExportSvg = useCallback(() => {
    try {
      const svg = renderSvgDocument(project, {
        size: project.pngSize,
        includeXmlDeclaration: true,
        title: "夏猫式ピクトグラム",
      });
      downloadBlob(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
        "natsuneko-pictogram.svg",
      );
      report(
        "success",
        "SVGのダウンロードを開始しました。ブラウザのダウンロード一覧で保存結果を確認してください。",
      );
    } catch (error) {
      report(
        "error",
        errorMessage(error, "SVGを生成できませんでした。もう一度お試しください。"),
      );
    }
  }, [project, report]);

  const handleExportPng = useCallback(async () => {
    if (isExportingPng) return;
    setIsExportingPng(true);
    report("info", `${project.pngSize}pxの透過PNGを作成しています…`);
    try {
      const blob = await renderPngBlob(project, project.pngSize);
      downloadBlob(blob, `natsuneko-pictogram-${project.pngSize}px.png`);
      report(
        "success",
        `${project.pngSize}pxの透過PNGダウンロードを開始しました。ブラウザのダウンロード一覧で保存結果を確認してください。`,
      );
    } catch (error) {
      report(
        "error",
        errorMessage(error, "PNGを生成できませんでした。もう一度お試しください。"),
      );
    } finally {
      setIsExportingPng(false);
    }
  }, [isExportingPng, project, report]);

  useEffect(() => {
    const warnBeforeClose = (event: BeforeUnloadEvent) => {
      if (!history.isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeClose);
    return () => window.removeEventListener("beforeunload", warnBeforeClose);
  }, [history.isDirty]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        handleSaveJson();
      } else if (key === "z" && event.shiftKey) {
        event.preventDefault();
        if (history.canRedo) {
          history.redo();
          setActivePreset(null);
          report("info", "取り消した操作をやり直しました。");
        }
      } else if (key === "z") {
        event.preventDefault();
        if (history.canUndo) {
          history.undo();
          setActivePreset(null);
          report("info", "ひとつ前の状態に戻しました。");
        }
      } else if (key === "y") {
        event.preventDefault();
        if (history.canRedo) {
          history.redo();
          setActivePreset(null);
          report("info", "取り消した操作をやり直しました。");
        }
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleSaveJson, history, report]);

  const applyPreset = (presetId: PresetId) => {
    history.set((current) => applyPosePreset(current, presetId));
    setActivePreset(presetId);
    setSelectedJoint(null);
    report("success", "基本ポーズを変更しました。関節を動かして調整できます。");
  };

  const moveJoint = (jointId: JointId, point: NormalizedPoint) => {
    history.preview((current) => updateJoint(current, jointId, point));
    setActivePreset(null);
  };

  const keyboardMoveJoint = (jointId: JointId, point: NormalizedPoint) => {
    history.set((current) => updateJoint(current, jointId, point));
    setActivePreset(null);
    report("info", `${jointLabel(jointId)}を動かしました。`);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-row">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              ↗
            </div>
            <div>
              <h1 className="app-title">夏猫式ピクトグラムエディター</h1>
              <p className="app-subtitle">点を動かすだけで、自分のポーズをつくるWebアプリ</p>
            </div>
          </div>
          <div
            className={`save-state${history.isDirty ? " is-dirty" : ""}`}
            aria-label={
              history.isDirty
                ? "JSONに未出力の変更があります"
                : "現在の編集内容に変更はありません"
            }
            aria-live="polite"
          >
            <span>{history.isDirty ? "JSON未出力" : "変更なし"}</span>
          </div>
        </div>
      </header>

      <Toolbar
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        isExportingPng={isExportingPng}
        onNew={handleNew}
        onOpen={() => fileInputRef.current?.click()}
        onSaveJson={handleSaveJson}
        onUndo={() => {
          history.undo();
          setActivePreset(null);
          report("info", "ひとつ前の状態に戻しました。");
        }}
        onRedo={() => {
          history.redo();
          setActivePreset(null);
          report("info", "取り消した操作をやり直しました。");
        }}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
      />

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".json,.neko-pict.json,application/json"
        aria-label="編集用JSONを選ぶ"
        onChange={handleFileChange}
      />

      <main className="workspace">
        <div className="editor-grid">
          <PosePanel activePreset={activePreset} onChoosePreset={applyPreset} />

          <section className="canvas-column" aria-labelledby="canvas-title">
            <div className="panel canvas-panel">
              <div className="canvas-heading">
                <div className="canvas-heading-copy">
                  <h2 className="panel-title" id="canvas-title">
                    2. ポーズを調整
                  </h2>
                  <p className="panel-lead">人物の上にある点を直接動かします。</p>
                </div>
                <span className="selected-joint-label">
                  {jointLabel(selectedJoint)}
                </span>
              </div>
              <PictogramCanvas
                project={project}
                selectedJoint={selectedJoint}
                onSelectJoint={setSelectedJoint}
                onDragStart={() => history.beginTransaction()}
                onDrag={moveJoint}
                onDragEnd={() => {
                  history.commitTransaction();
                  report("info", "関節を動かしました。JSON保存で編集内容を残せます。");
                }}
                onDragCancel={history.cancelTransaction}
                onKeyboardMove={keyboardMoveJoint}
              />
            </div>
          </section>

          <SettingsPanel
            project={project}
            onColorChange={(color) => {
              history.set((current) => setProjectColor(current, color));
              report("info", "人物の色を変更しました。");
            }}
            onMirror={() => {
              history.set(mirrorProject);
              setActivePreset(null);
              setSelectedJoint(null);
              report("info", "ポーズを左右反転しました。");
            }}
            onSetLimbDepth={(limbId: LimbId, depth: LimbDepth) => {
              history.set((current) => setLimbDepth(current, limbId, depth));
              report("info", "手足の前後関係を変更しました。");
            }}
            onPngSizeChange={(size) => {
              history.set((current) => setPngExportSize(current, size));
              report("info", `PNGサイズを${size}pxに変更しました。`);
            }}
            onPngSizeError={(message) => report("error", message)}
          />
        </div>

        <PreviewStrip project={project} />

        <div
          className={`status-bar${
            status.kind === "info" ? "" : ` is-${status.kind}`
          }`}
          role={status.kind === "error" ? "alert" : "status"}
          aria-live={status.kind === "error" ? "assertive" : "polite"}
        >
          {status.text}
        </div>

        <p className="privacy-note">
          編集内容と画像の生成はこのブラウザ内で行います。作品データをアプリの機能として外部へ送信しません。
        </p>
      </main>

      <footer className="app-footer">
        本アプリの出力は案内表示風の素材です。JISなどの正式なピクトグラム規格への準拠を保証するものではありません。
      </footer>
    </div>
  );
}
