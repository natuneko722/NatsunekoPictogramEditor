import { describe, expect, it } from "vitest";
import {
  EDITOR_HISTORY_LIMIT,
  createEditorHistoryState,
  editorHistoryReducer,
} from "./useEditorHistory";

describe("editor history", () => {
  it("undoes and redoes a committed edit", () => {
    let state = createEditorHistoryState("a");
    state = editorHistoryReducer(state, { type: "set", update: "b" });
    state = editorHistoryReducer(state, { type: "undo" });
    expect(state.present).toBe("a");

    state = editorHistoryReducer(state, { type: "redo" });
    expect(state.present).toBe("b");
  });

  it("records one history entry for a multi-step drag transaction", () => {
    let state = createEditorHistoryState({ x: 0 });
    state = editorHistoryReducer(state, { type: "begin-transaction" });
    state = editorHistoryReducer(state, { type: "preview", update: { x: 1 } });
    state = editorHistoryReducer(state, { type: "preview", update: { x: 2 } });
    state = editorHistoryReducer(state, { type: "preview", update: { x: 3 } });
    state = editorHistoryReducer(state, { type: "commit-transaction" });

    expect(state.past).toHaveLength(1);
    state = editorHistoryReducer(state, { type: "undo" });
    expect(state.present).toEqual({ x: 0 });
  });

  it("tracks the JSON-output baseline independently from undo", () => {
    let state = createEditorHistoryState({ value: 1 });
    state = editorHistoryReducer(state, { type: "set", update: { value: 2 } });
    expect(JSON.stringify(state.present)).not.toBe(state.savedFingerprint);

    state = editorHistoryReducer(state, { type: "mark-saved" });
    expect(JSON.stringify(state.present)).toBe(state.savedFingerprint);
    state = editorHistoryReducer(state, { type: "undo" });
    expect(JSON.stringify(state.present)).not.toBe(state.savedFingerprint);
  });

  it("caps past and future snapshots at the configured limit", () => {
    let state = createEditorHistoryState(0);
    for (let value = 1; value <= EDITOR_HISTORY_LIMIT + 5; value += 1) {
      state = editorHistoryReducer(state, { type: "set", update: value });
    }
    expect(state.past).toHaveLength(EDITOR_HISTORY_LIMIT);

    for (let count = 0; count < EDITOR_HISTORY_LIMIT; count += 1) {
      state = editorHistoryReducer(state, { type: "undo" });
    }
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(EDITOR_HISTORY_LIMIT);
    expect(state.present).toBe(5);
  });
});
