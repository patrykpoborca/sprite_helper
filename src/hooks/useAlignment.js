import { useCallback, useMemo } from 'react'
import { computeAlignmentOffsets } from '../utils/alignment.js'

export function useAlignment({ frames, setFrames, snapPoint, setSelectedFrameId, setViewMode }) {
  const alignmentData = useMemo(() => {
    if (!frames.length) return { offsets: new Map(), targetX: 0, targetY: 0 }
    return computeAlignmentOffsets(frames, snapPoint)
  }, [frames, snapPoint])

  const setFrameSnapPoint = useCallback((frameId, x, y) => {
    setFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, snapPointX: x, snapPointY: y } : f
    ))
  }, [setFrames])

  const clearFrameSnapPoint = useCallback((frameId) => {
    setFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, snapPointX: null, snapPointY: null } : f
    ))
  }, [setFrames])

  const setFrameRefPoint = useCallback((frameId, x, y) => {
    setFrames(prev => {
      const updated = prev.map(f =>
        f.id === frameId ? { ...f, refPointX: x, refPointY: y } : f
      )

      const currentIdx = updated.findIndex(f => f.id === frameId)
      let nextFrame = null
      for (let i = currentIdx + 1; i < updated.length; i++) {
        if (updated[i].refPointX === null) { nextFrame = updated[i]; break }
      }
      if (!nextFrame) {
        for (let i = 0; i < currentIdx; i++) {
          if (updated[i].refPointX === null) { nextFrame = updated[i]; break }
        }
      }

      if (nextFrame) {
        setSelectedFrameId(nextFrame.id)
      } else {
        setViewMode('aligned')
      }

      return updated
    })
  }, [setFrames, setSelectedFrameId, setViewMode])

  const removeFrameRefPoint = useCallback((frameId) => {
    setFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, refPointX: null, refPointY: null } : f
    ))
  }, [setFrames])

  const hasAlignmentData = (snapPoint !== null || frames.some(f => f.snapPointX != null)) && frames.some(f => f.refPointX !== null)

  return {
    alignmentData,
    setFrameSnapPoint,
    clearFrameSnapPoint,
    setFrameRefPoint,
    removeFrameRefPoint,
    hasAlignmentData,
  }
}
