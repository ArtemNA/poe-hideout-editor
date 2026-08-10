import { describe, expect, it } from 'vitest'
import { commitHistory, createHistory, redoHistory, undoHistory } from '../src/editor/history'

describe('history', () => {
  it('undoes and redoes semantic transactions', () => {
    let history = createHistory({ x: 0 })
    history = commitHistory(history, { x: 50 })
    history = undoHistory(history)
    expect(history.present.x).toBe(0)
    history = redoHistory(history)
    expect(history.present.x).toBe(50)
  })
})
