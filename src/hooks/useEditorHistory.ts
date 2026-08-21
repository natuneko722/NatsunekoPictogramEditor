import { useCallback, useMemo, useReducer } from "react";

export const EDITOR_HISTORY_LIMIT = 100;

type ValueUpdate<T> = T | ((current: T) => T);

export interface EditorHistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  savedFingerprint: string;
  transactionStart: T | null;
}

export type EditorHistoryAction<T> =
  | { type: "set"; update: ValueUpdate<T> }
  | { type: "begin-transaction" }
  | { type: "preview"; update: ValueUpdate<T> }
  | { type: "commit-transaction" }
  | { type: "cancel-transaction" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T; markSaved: boolean }
  | { type: "mark-saved" };

const fingerprint = <T,>(value: T) => JSON.stringify(value);

const resolveUpdate = <T,>(update: ValueUpdate<T>, current: T): T =>
  typeof update === "function"
    ? (update as (current: T) => T)(current)
    : update;

export function createEditorHistoryState<T>(initialValue: T): EditorHistoryState<T> {
  return {
    past: [],
    present: initialValue,
    future: [],
    savedFingerprint: fingerprint(initialValue),
    transactionStart: null,
  };
}

export function editorHistoryReducer<T>(
  state: EditorHistoryState<T>,
  action: EditorHistoryAction<T>,
): EditorHistoryState<T> {
  switch (action.type) {
    case "set": {
      const next = resolveUpdate(action.update, state.present);
      if (fingerprint(next) === fingerprint(state.present)) return state;
      return {
        ...state,
        past: [...state.past, state.present].slice(-EDITOR_HISTORY_LIMIT),
        present: next,
        future: [],
        transactionStart: null,
      };
    }
    case "begin-transaction":
      return state.transactionStart === null
        ? { ...state, transactionStart: state.present }
        : state;
    case "preview": {
      const next = resolveUpdate(action.update, state.present);
      return {
        ...state,
        present: next,
        transactionStart: state.transactionStart ?? state.present,
      };
    }
    case "commit-transaction": {
      if (state.transactionStart === null) return state;
      const changed = fingerprint(state.transactionStart) !== fingerprint(state.present);
      return {
        ...state,
        past: changed
          ? [...state.past, state.transactionStart].slice(-EDITOR_HISTORY_LIMIT)
          : state.past,
        future: changed ? [] : state.future,
        transactionStart: null,
      };
    }
    case "cancel-transaction":
      return state.transactionStart === null
        ? state
        : { ...state, present: state.transactionStart, transactionStart: null };
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, EDITOR_HISTORY_LIMIT),
        transactionStart: null,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        past: [...state.past, state.present].slice(-EDITOR_HISTORY_LIMIT),
        present: next,
        future: state.future.slice(1),
        transactionStart: null,
      };
    }
    case "reset":
      return {
        past: [],
        present: action.value,
        future: [],
        savedFingerprint: action.markSaved
          ? fingerprint(action.value)
          : state.savedFingerprint,
        transactionStart: null,
      };
    case "mark-saved":
      return { ...state, savedFingerprint: fingerprint(state.present) };
  }
}

export function useEditorHistory<T>(initialValue: T) {
  const [state, dispatch] = useReducer(
    editorHistoryReducer<T>,
    initialValue,
    createEditorHistoryState,
  );

  const set = useCallback((update: ValueUpdate<T>) => {
    dispatch({ type: "set", update });
  }, []);

  const beginTransaction = useCallback(() => {
    dispatch({ type: "begin-transaction" });
  }, []);

  const preview = useCallback((update: ValueUpdate<T>) => {
    dispatch({ type: "preview", update });
  }, []);

  const commitTransaction = useCallback(() => {
    dispatch({ type: "commit-transaction" });
  }, []);

  const cancelTransaction = useCallback(() => {
    dispatch({ type: "cancel-transaction" });
  }, []);

  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  const reset = useCallback((value: T, markSaved = true) => {
    dispatch({ type: "reset", value, markSaved });
  }, []);

  const markSaved = useCallback(() => dispatch({ type: "mark-saved" }), []);

  return useMemo(
    () => ({
      value: state.present,
      set,
      beginTransaction,
      preview,
      commitTransaction,
      cancelTransaction,
      undo,
      redo,
      reset,
      markSaved,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      isDirty: fingerprint(state.present) !== state.savedFingerprint,
    }),
    [
      beginTransaction,
      cancelTransaction,
      commitTransaction,
      markSaved,
      preview,
      redo,
      reset,
      set,
      state.future.length,
      state.past.length,
      state.present,
      state.savedFingerprint,
      undo,
    ],
  );
}
