import { describe, it, expect } from 'vitest'
import { computeAlignmentOffsets, computeExportPadding } from './alignment.js'

describe('computeAlignmentOffsets', () => {
  it('returns empty offsets when no frames', () => {
    const result = computeAlignmentOffsets([], { x: 10, y: 10 })
    expect(result.offsets.size).toBe(0)
    expect(result.targetX).toBe(0)
    expect(result.targetY).toBe(0)
  })

  it('returns zero offsets when snapPoint is null and no per-frame snap points', () => {
    const frames = [
      { id: 'a', refPointX: 5, refPointY: 5 },
      { id: 'b', refPointX: 10, refPointY: 10 },
    ]
    const result = computeAlignmentOffsets(frames, null)
    expect(result.offsets.size).toBe(0)
    expect(result.targetX).toBe(0)
    expect(result.targetY).toBe(0)
  })

  it('correctly computes dx/dy as snapPoint - refPoint for each frame', () => {
    const frames = [
      { id: 'a', refPointX: 5, refPointY: 10 },
      { id: 'b', refPointX: 20, refPointY: 30 },
    ]
    const snapPoint = { x: 15, y: 25 }
    const result = computeAlignmentOffsets(frames, snapPoint)

    expect(result.offsets.get('a')).toEqual({ dx: 10, dy: 15 })
    expect(result.offsets.get('b')).toEqual({ dx: -5, dy: -5 })
    expect(result.targetX).toBe(15)
    expect(result.targetY).toBe(25)
  })

  it('uses per-frame snap point override when present', () => {
    const frames = [
      { id: 'a', refPointX: 5, refPointY: 10, snapPointX: 20, snapPointY: 30 },
    ]
    // No global snap, but per-frame snap exists
    const result = computeAlignmentOffsets(frames, null)

    expect(result.offsets.get('a')).toEqual({ dx: 15, dy: 20 })
  })

  it('per-frame snap takes priority over global snap', () => {
    const frames = [
      { id: 'a', refPointX: 5, refPointY: 10, snapPointX: 50, snapPointY: 60 },
      { id: 'b', refPointX: 5, refPointY: 10 },
    ]
    const globalSnap = { x: 15, y: 25 }
    const result = computeAlignmentOffsets(frames, globalSnap)

    // Frame 'a' should use its per-frame snap (50,60)
    expect(result.offsets.get('a')).toEqual({ dx: 45, dy: 50 })
    // Frame 'b' should use global snap (15,25)
    expect(result.offsets.get('b')).toEqual({ dx: 10, dy: 15 })
  })

  it('handles frames with missing refPoints (should get {dx:0, dy:0})', () => {
    const frames = [
      { id: 'a' }, // no refPointX/refPointY
      { id: 'b', refPointX: 5, refPointY: 10 },
    ]
    const snapPoint = { x: 15, y: 25 }
    const result = computeAlignmentOffsets(frames, snapPoint)

    expect(result.offsets.get('a')).toEqual({ dx: 0, dy: 0 })
    expect(result.offsets.get('b')).toEqual({ dx: 10, dy: 15 })
  })
})

describe('computeExportPadding', () => {
  it('returns zero padding when all offsets are zero', () => {
    const offsets = new Map([
      ['a', { dx: 0, dy: 0 }],
      ['b', { dx: 0, dy: 0 }],
    ])
    const result = computeExportPadding(offsets, 32, 32)
    expect(result.padLeft).toBe(0)
    expect(result.padRight).toBe(0)
    expect(result.padTop).toBe(0)
    expect(result.padBottom).toBe(0)
    expect(result.outputCellW).toBe(32)
    expect(result.outputCellH).toBe(32)
  })

  it('correctly computes padLeft from negative dx values', () => {
    const offsets = new Map([
      ['a', { dx: -10, dy: 0 }],
      ['b', { dx: -3, dy: 0 }],
    ])
    const result = computeExportPadding(offsets, 32, 32)
    expect(result.padLeft).toBe(10)
    expect(result.padRight).toBe(0)
  })

  it('correctly computes padRight from positive dx values', () => {
    const offsets = new Map([
      ['a', { dx: 7, dy: 0 }],
      ['b', { dx: 15, dy: 0 }],
    ])
    const result = computeExportPadding(offsets, 32, 32)
    expect(result.padLeft).toBe(0)
    expect(result.padRight).toBe(15)
  })

  it('correctly computes padTop and padBottom from dy values', () => {
    const offsets = new Map([
      ['a', { dx: 0, dy: -8 }],
      ['b', { dx: 0, dy: 12 }],
    ])
    const result = computeExportPadding(offsets, 32, 32)
    expect(result.padTop).toBe(8)
    expect(result.padBottom).toBe(12)
  })

  it('outputCellW = cellWidth + padLeft + padRight, outputCellH = cellHeight + padTop + padBottom', () => {
    const offsets = new Map([
      ['a', { dx: -5, dy: -3 }],
      ['b', { dx: 10, dy: 7 }],
    ])
    const result = computeExportPadding(offsets, 64, 48)
    expect(result.padLeft).toBe(5)
    expect(result.padRight).toBe(10)
    expect(result.padTop).toBe(3)
    expect(result.padBottom).toBe(7)
    expect(result.outputCellW).toBe(64 + 5 + 10)
    expect(result.outputCellH).toBe(48 + 3 + 7)
  })
})
