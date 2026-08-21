import { CANVAS_SIZE, type PictogramProject } from "../model";
import { renderPictogramBody } from "../render/svg";

const PREVIEW_SIZES = [24, 32, 64] as const;

interface PreviewStripProps {
  project: PictogramProject;
}

export function PreviewStrip({ project }: PreviewStripProps) {
  return (
    <section className="panel preview-panel" aria-labelledby="preview-title">
      <div className="preview-heading">
        <h2 className="panel-title" id="preview-title">
          縮小プレビュー
        </h2>
        <p className="panel-lead">小さく表示したときの見え方を比べられます。</p>
      </div>
      <div className="preview-list">
        {PREVIEW_SIZES.map((size) => (
          <div className="preview-item" key={size}>
            <div
              className="preview-frame"
              style={{ width: size, height: size }}
              aria-label={`${size}ピクセルのプレビュー`}
            >
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                role="img"
                aria-label={`${size}ピクセルでの完成イメージ`}
                dangerouslySetInnerHTML={{
                  __html: renderPictogramBody(project, {
                    idPrefix: `preview-${size}-`,
                  }),
                }}
              />
            </div>
            <span className="preview-size">{size}px</span>
          </div>
        ))}
      </div>
    </section>
  );
}
