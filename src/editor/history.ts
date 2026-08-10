export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export function createHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] }
}

export function commitHistory<T>(history: HistoryState<T>, next: T, limit = 100): HistoryState<T> {
  if (Object.is(history.present, next)) return history
  return { past: [...history.past, history.present].slice(-limit), present: next, future: [] }
}

export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (!history.past.length) return history
  return { past: history.past.slice(0, -1), present: history.past.at(-1)!, future: [history.present, ...history.future] }
}

export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (!history.future.length) return history
  return { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) }
}
