import { useRef, useState, useCallback, useEffect, useMemo } from 'react'

function SwapCropOverlay({ image, onApplyCrop, onUseFullImage, onCancel }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const [crop, setCrop] = useState(null)

  const displayScale = useMemo(() => {
    if (!image) return 1
    const maxW = window.innerWidth * 0.7
    const maxH = window.innerHeight * 0.7
    return Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight, 1)
  }, [image])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    const w = Math.round(image.naturalWidth * displayScale)
    const h = Math.round(image.naturalHeight * displayScale)
    canvas.width = w
    canvas.height = h
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(image, 0, 0, w, h)

    const rect = crop || (dragging ? {
      x: Math.min(dragging.startX, dragging.currentX),
      y: Math.min(dragging.startY, dragging.currentY),
      w: Math.abs(dragging.currentX - dragging.startX),
      h: Math.abs(dragging.currentY - dragging.startY),
    } : null)

    if (rect && rect.w > 2 && rect.h > 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, w, rect.y)
      ctx.fillRect(0, rect.y, rect.x, rect.h)
      ctx.fillRect(rect.x + rect.w, rect.y, w - rect.x - rect.w, rect.h)
      ctx.fillRect(0, rect.y + rect.h, w, h - rect.y - rect.h)

      ctx.strokeStyle = '#4a90d9'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      ctx.setLineDash([])
    }
  }, [image, displayScale, crop, dragging])

  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const handleMouseDown = useCallback((e) => {
    const pos = getCanvasPos(e)
    if (!pos) return
    setCrop(null)
    setDragging({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
  }, [getCanvasPos])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    const pos = getCanvasPos(e)
    if (pos) {
      setDragging((prev) => ({ ...prev, currentX: pos.x, currentY: pos.y }))
    }
  }, [dragging, getCanvasPos])

  const handleMouseUp = useCallback(() => {
    if (!dragging) return
    const x = Math.min(dragging.startX, dragging.currentX)
    const y = Math.min(dragging.startY, dragging.currentY)
    const w = Math.abs(dragging.currentX - dragging.startX)
    const h = Math.abs(dragging.currentY - dragging.startY)
    setDragging(null)
    if (w > 5 && h > 5) {
      setCrop({ x, y, w, h })
    }
  }, [dragging])

  const handleApply = useCallback(() => {
    if (!crop) return
    onApplyCrop({
      x: Math.round(crop.x / displayScale),
      y: Math.round(crop.y / displayScale),
      w: Math.round(crop.w / displayScale),
      h: Math.round(crop.h / displayScale),
    })
  }, [crop, displayScale, onApplyCrop])

  if (!image) return null

  return (
    <div className="swap-crop-overlay" onClick={onCancel}>
      <div className="swap-crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="swap-crop-header">
          <span>Select a region to crop from the replacement image</span>
          <button className="swap-crop-close" onClick={onCancel}>&#10005;</button>
        </div>
        <div className="swap-crop-canvas-wrap" ref={containerRef}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: 'crosshair' }}
          />
        </div>
        <div className="swap-crop-actions">
          <button onClick={onUseFullImage}>Use Full Image</button>
          <button
            className="swap-crop-apply"
            onClick={handleApply}
            disabled={!crop}
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  )
}

export default SwapCropOverlay
