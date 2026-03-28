import { describe, it, expect } from 'vitest'
import { buildProcessedCanvas } from './canvasUtils.js'

/**
 * NOTE: Most functions in canvasUtils.js (drawCheckerboard, buildProcessedCanvas)
 * depend on browser Canvas/DOM APIs (document.createElement, CanvasRenderingContext2D).
 * Full testing would require jsdom + @napi-rs/canvas or similar.
 *
 * Below we test the early-return guard logic of buildProcessedCanvas which does not
 * require a canvas.
 */

describe('buildProcessedCanvas', () => {
  it('returns null when swapImage is null', () => {
    expect(buildProcessedCanvas(null, null, { color: '#00ff00', tolerance: 30 })).toBeNull()
  })

  it('returns null when swapImage is undefined', () => {
    expect(buildProcessedCanvas(undefined, null, { color: '#00ff00', tolerance: 30 })).toBeNull()
  })

  it('returns null when chromaKey is null', () => {
    const fakeImage = { naturalWidth: 10, naturalHeight: 10 }
    expect(buildProcessedCanvas(fakeImage, null, null)).toBeNull()
  })

  it('returns null when chromaKey is undefined', () => {
    const fakeImage = { naturalWidth: 10, naturalHeight: 10 }
    expect(buildProcessedCanvas(fakeImage, null, undefined)).toBeNull()
  })
})
