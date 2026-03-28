/**
 * Compute per-frame alignment offsets so all reference points align to the snap point.
 * Supports per-frame snap point overrides (frame.snapPointX/snapPointY).
 *
 * @param {object[]} frames - Array of frame objects with refPointX/refPointY and optional snapPointX/snapPointY
 * @param {{ x: number, y: number } | null} snapPoint - Shared snap point in cell-local coords
 * @returns {{ offsets: Map<string, {dx: number, dy: number}>, targetX: number, targetY: number }}
 */
export function computeAlignmentOffsets(frames, snapPoint) {
  const hasGlobalSnap = snapPoint !== null
  const hasAnyPerFrameSnap = Array.isArray(frames) && frames.some(f => f.snapPointX != null)

  if ((!hasGlobalSnap && !hasAnyPerFrameSnap) || !Array.isArray(frames) || frames.length === 0) {
    return { offsets: new Map(), targetX: 0, targetY: 0 }
  }

  const offsets = new Map()
  for (const frame of frames) {
    // Resolve effective snap point: per-frame override takes priority
    const effectiveSnapX = frame.snapPointX != null ? frame.snapPointX : (snapPoint ? snapPoint.x : null)
    const effectiveSnapY = frame.snapPointY != null ? frame.snapPointY : (snapPoint ? snapPoint.y : null)

    if (effectiveSnapX != null && effectiveSnapY != null && frame.refPointX != null && frame.refPointY != null) {
      offsets.set(frame.id, {
        dx: effectiveSnapX - frame.refPointX,
        dy: effectiveSnapY - frame.refPointY,
      })
    } else {
      offsets.set(frame.id, { dx: 0, dy: 0 })
    }
  }

  // targetX/targetY remains the global snap point for aligned-view markers
  return { offsets, targetX: snapPoint ? snapPoint.x : 0, targetY: snapPoint ? snapPoint.y : 0 }
}

/**
 * Compute export padding so no content clips when frames are shifted.
 *
 * @param {Map<string, {dx: number, dy: number}>} offsets
 * @param {number} cellWidth
 * @param {number} cellHeight
 * @returns {{ padLeft: number, padRight: number, padTop: number, padBottom: number, outputCellW: number, outputCellH: number }}
 */
export function computeExportPadding(offsets, cellWidth, cellHeight) {
  let minDx = 0, maxDx = 0, minDy = 0, maxDy = 0

  for (const { dx, dy } of offsets.values()) {
    minDx = Math.min(minDx, dx)
    maxDx = Math.max(maxDx, dx)
    minDy = Math.min(minDy, dy)
    maxDy = Math.max(maxDy, dy)
  }

  // Padding needed: if a frame shifts left (negative dx), we need pad on the left
  // If a frame shifts right (positive dx), we need pad on the right
  const padLeft = Math.ceil(Math.abs(minDx))
  const padRight = Math.ceil(maxDx)
  const padTop = Math.ceil(Math.abs(minDy))
  const padBottom = Math.ceil(maxDy)

  return {
    padLeft,
    padRight,
    padTop,
    padBottom,
    outputCellW: cellWidth + padLeft + padRight,
    outputCellH: cellHeight + padTop + padBottom,
  }
}
