interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  isExportingPng: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSaveJson: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
}

interface ToolButtonProps {
  icon: string;
  label: string;
  title?: string;
  disabled?: boolean;
  primary?: boolean;
  onClick: () => void;
}

function ToolButton({
  icon,
  label,
  title,
  disabled,
  primary,
  onClick,
}: ToolButtonProps) {
  return (
    <button
      className={`tool-button${primary ? " is-primary" : ""}`}
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="tool-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function Toolbar({
  canUndo,
  canRedo,
  isExportingPng,
  onNew,
  onOpen,
  onSaveJson,
  onUndo,
  onRedo,
  onExportSvg,
  onExportPng,
}: ToolbarProps) {
  return (
    <div className="toolbar-wrap" aria-label="プロジェクト操作">
      <div className="toolbar">
        <div className="toolbar-group">
          <ToolButton icon="＋" label="新規" onClick={onNew} />
          <ToolButton icon="↑" label="JSON読込" onClick={onOpen} />
          <ToolButton
            icon="↓"
            label="JSON保存"
            primary
            onClick={onSaveJson}
          />
        </div>
        <span className="toolbar-divider" aria-hidden="true" />
        <div className="toolbar-group">
          <ToolButton
            icon="↶"
            label="元に戻す"
            title="元に戻す（Ctrl+Z）"
            disabled={!canUndo}
            onClick={onUndo}
          />
          <ToolButton
            icon="↷"
            label="やり直し"
            title="やり直し（Ctrl+Y）"
            disabled={!canRedo}
            onClick={onRedo}
          />
        </div>
        <span className="toolbar-divider" aria-hidden="true" />
        <div className="toolbar-group">
          <ToolButton icon="◇" label="SVG書出し" onClick={onExportSvg} />
          <ToolButton
            icon="▧"
            label={isExportingPng ? "PNG作成中…" : "PNG書出し"}
            disabled={isExportingPng}
            onClick={onExportPng}
          />
        </div>
      </div>
    </div>
  );
}
