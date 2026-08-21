import { useCallback, useRef } from "react";
import {
  CANVAS_SIZE,
  JOINT_IDS,
  canvasPointToNormalized,
  normalizedPointToCanvas,
  type JointId,
  type NormalizedPoint,
  type PictogramProject,
} from "../model";
import { renderPictogramBody } from "../render/svg";

const JOINT_LABELS: Record<JointId, string> = {
  head: "頭",
  leftShoulder: "左肩",
  rightShoulder: "右肩",
  leftElbow: "左ひじ",
  rightElbow: "右ひじ",
  leftHand: "左手",
  rightHand: "右手",
  hip: "腰",
  leftKnee: "左ひざ",
  rightKnee: "右ひざ",
  leftFoot: "左足",
  rightFoot: "右足",
};

interface ActivePointer {
  pointerId: number;
  jointId: JointId;
}

interface PictogramCanvasProps {
  project: PictogramProject;
  selectedJoint: JointId | null;
  onSelectJoint: (jointId: JointId | null) => void;
  onDragStart: (jointId: JointId) => void;
  onDrag: (jointId: JointId, point: NormalizedPoint) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
  onKeyboardMove: (jointId: JointId, point: NormalizedPoint) => void;
}

export const jointLabel = (jointId: JointId | null) =>
  jointId ? JOINT_LABELS[jointId] : "関節を選んでください";

export function PictogramCanvas({
  project,
  selectedJoint,
  onSelectJoint,
  onDragStart,
  onDrag,
  onDragEnd,
  onDragCancel,
  onKeyboardMove,
}: PictogramCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const activePointer = useRef<ActivePointer | null>(null);

  const clientPointToNormalized = useCallback(
    (clientX: number, clientY: number): NormalizedPoint | null => {
      const svg = svgRef.current;
      const matrix = svg?.getScreenCTM();
      if (!svg || !matrix) return null;

      const svgPoint = svg.createSVGPoint();
      svgPoint.x = clientX;
      svgPoint.y = clientY;
      const point = svgPoint.matrixTransform(matrix.inverse());
      return canvasPointToNormalized({ x: point.x, y: point.y });
    },
    [],
  );

  const finishPointer = useCallback(
    (pointerId: number, cancelled: boolean) => {
      const active = activePointer.current;
      if (!active || active.pointerId !== pointerId) return;

      activePointer.current = null;
      const svg = svgRef.current;
      if (svg?.hasPointerCapture(pointerId)) svg.releasePointerCapture(pointerId);
      if (cancelled) onDragCancel();
      else onDragEnd();
    },
    [onDragCancel, onDragEnd],
  );

  return (
    <>
      <div className="canvas-stage">
        <svg
          ref={svgRef}
          className="editor-canvas"
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          role="group"
          aria-label="ピクトグラム編集キャンバス"
          aria-describedby="canvas-help"
          onPointerMove={(event) => {
            const active = activePointer.current;
            if (!active || active.pointerId !== event.pointerId) return;
            const point = clientPointToNormalized(event.clientX, event.clientY);
            if (point) onDrag(active.jointId, point);
          }}
          onPointerUp={(event) => finishPointer(event.pointerId, false)}
          onPointerCancel={(event) => finishPointer(event.pointerId, true)}
          onClick={(event) => {
            if (event.target === event.currentTarget) onSelectJoint(null);
          }}
        >
          <g
            aria-hidden="true"
            dangerouslySetInnerHTML={{
              __html: renderPictogramBody(project, { idPrefix: "editor-" }),
            }}
          />
          <g aria-label="関節の操作点">
            {JOINT_IDS.map((jointId) => {
              const point = normalizedPointToCanvas(project.joints[jointId]);
              const isSelected = selectedJoint === jointId;
              const badgeX = Math.min(
                CANVAS_SIZE - 48,
                Math.max(48, point.x),
              );
              const badgeY = Math.max(28, point.y - 31);
              return (
                <g
                  key={jointId}
                  className={`joint-handle${isSelected ? " is-selected" : ""}`}
                  transform={`translate(${point.x} ${point.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${JOINT_LABELS[jointId]}。ドラッグまたは矢印キーで動かせます`}
                  aria-pressed={isSelected}
                  onFocus={() => onSelectJoint(jointId)}
                  onPointerDown={(event) => {
                    if (event.button !== 0 && event.pointerType !== "touch") return;
                    event.preventDefault();
                    event.stopPropagation();
                    activePointer.current = {
                      pointerId: event.pointerId,
                      jointId,
                    };
                    svgRef.current?.setPointerCapture(event.pointerId);
                    onSelectJoint(jointId);
                    onDragStart(jointId);
                  }}
                  onKeyDown={(event) => {
                    const direction = {
                      ArrowLeft: { x: -1, y: 0 },
                      ArrowRight: { x: 1, y: 0 },
                      ArrowUp: { x: 0, y: -1 },
                      ArrowDown: { x: 0, y: 1 },
                    }[event.key];
                    if (!direction) return;
                    event.preventDefault();
                    const step = (event.shiftKey ? 8 : 2) / CANVAS_SIZE;
                    onKeyboardMove(
                      jointId,
                      canvasPointToNormalized({
                        x: (project.joints[jointId].x + direction.x * step) *
                          CANVAS_SIZE,
                        y: (project.joints[jointId].y + direction.y * step) *
                          CANVAS_SIZE,
                      }),
                    );
                  }}
                >
                  <circle className="joint-hit-area" r="22" />
                  <circle className="joint-ring" r="11" />
                  <circle className="joint-dot" r="5.5" />
                  {isSelected && (
                    <g
                      className="joint-name-badge"
                      transform={`translate(${badgeX - point.x} ${badgeY - point.y})`}
                    >
                      <rect x="-42" y="-13" width="84" height="23" rx="7" />
                      <text y="4">{JOINT_LABELS[jointId]}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <p className="canvas-help" id="canvas-help">
        オレンジの点をドラッグしてポーズを調整します。選んだ点は矢印キーでも動かせます（Shiftで大きく移動）。
      </p>
    </>
  );
}
