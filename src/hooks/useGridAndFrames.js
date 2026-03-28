import { useRef, useCallback, useMemo } from 'react'

export function useGridAndFrames({
  imageInfo, frames, setFrames, gridConfig, setGridConfig,
  selectedFrameId, setSelectedFrameId, setSnapPoint,
}) {
  const nextFrameIdRef = useRef(1)

  const selectedFrameIndex = useMemo(() => {
    return frames.findIndex(f => f.id === selectedFrameId)
  }, [frames, selectedFrameId])

  const selectedFrame = useMemo(() => {
    return selectedFrameIndex >= 0 ? frames[selectedFrameIndex] : null
  }, [frames, selectedFrameIndex])

  const applyGrid = useCallback((rows, cols) => {
    if (!imageInfo) return
    if (frames.length > 0 && frames.some(f => f.refPointX !== null || f.swapImage || f.snapPointX != null)) {
      if (!window.confirm('Applying a new grid will clear all frames, ref points, snap point overrides, and swaps. Continue?')) return
    }
    const cellWidth = Math.floor(imageInfo.width / cols)
    const cellHeight = Math.floor(imageInfo.height / rows)
    const config = { rows, cols, cellWidth, cellHeight }
    setGridConfig(config)

    const newFrames = []
    nextFrameIdRef.current = 1
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newFrames.push({
          id: `f${nextFrameIdRef.current}`,
          row: r,
          col: c,
          label: `Frame ${nextFrameIdRef.current}`,
          srcX: c * cellWidth,
          srcY: r * cellHeight,
          srcW: cellWidth,
          srcH: cellHeight,
          refPointX: null,
          refPointY: null,
          snapPointX: null,
          snapPointY: null,
          swapImage: null,
          swapCrop: null,
          chromaKey: null,
          processedCanvas: null,
        })
        nextFrameIdRef.current++
      }
    }
    setFrames(newFrames)
    setSelectedFrameId(null)
    // Auto-center snap point on grid apply
    setSnapPoint({ x: Math.floor(cellWidth / 2), y: Math.floor(cellHeight / 2) })
  }, [imageInfo, frames, setGridConfig, setFrames, setSelectedFrameId, setSnapPoint])

  const selectFrame = useCallback((frameId) => {
    setSelectedFrameId(frameId)
  }, [setSelectedFrameId])

  const selectPrevFrame = useCallback(() => {
    if (!frames.length) return
    const prevIdx = selectedFrameIndex <= 0 ? frames.length - 1 : selectedFrameIndex - 1
    setSelectedFrameId(frames[prevIdx].id)
  }, [frames, selectedFrameIndex, setSelectedFrameId])

  const selectNextFrame = useCallback(() => {
    if (!frames.length) return
    const nextIdx = selectedFrameIndex >= frames.length - 1 ? 0 : selectedFrameIndex + 1
    setSelectedFrameId(frames[nextIdx].id)
  }, [frames, selectedFrameIndex, setSelectedFrameId])

  const updateFrameLabel = useCallback((frameId, label) => {
    setFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, label } : f
    ))
  }, [setFrames])

  const gridWarning = gridConfig && imageInfo && (
    imageInfo.width % gridConfig.cols !== 0 || imageInfo.height % gridConfig.rows !== 0
  )

  return {
    nextFrameIdRef,
    selectedFrameIndex,
    selectedFrame,
    applyGrid,
    selectFrame,
    selectPrevFrame,
    selectNextFrame,
    updateFrameLabel,
    gridWarning,
  }
}
