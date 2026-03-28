import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { extractFrameCanvas, getFrameCanvas } from '../utils/frameExtract.js'
import { drawCheckerboard, placeToSwapCrop } from '../utils/canvasUtils.js'

function SwapCropOverlay({
  image,
  targetCellWidth,
  targetCellHeight,
  frames,
  targetFrameId,
  sheetSource,
  onApply,
  onCancel,
}) {
  // --- Mode tabs ---
  const [mode, setMode] = useState('place') // 'place' | 'crop'

  // --- Place & Scale state ---
  const placeCanvasRef = useRef(null)
  const [lockAspect, setLockAspect] = useState(true)
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [placeDrag, setPlaceDrag] = useState(null)

  // Ghost overlay
  const [showGhost, setShowGhost] = useState(false)
  const [ghostFrameId, setGhostFrameId] = useState(targetFrameId)
  const [ghostOpacity, setGhostOpacity] = useState(30)

  // --- Crop mode state (legacy) ---
  const cropCanvasRef = useRef(null)
  const [cropDragging, setCropDragging] = useState(null)
  const [crop, setCrop] = useState(null)

  const cellW = targetCellWidth || 64
  const cellH = targetCellHeight || 64

  // Canvas display scale to fit the modal
  const placeDisplayScale = useMemo(() => {
    const maxDim = 400
    return Math.min(maxDim / cellW, maxDim / cellH, 4)
  }, [cellW, cellH])

  // Initial fit scale
  useEffect(() => {
    if (!image) return
    const imgW = image.naturalWidth || image.width
    const imgH = image.naturalHeight || image.height
    const fitScale = Math.min(cellW / imgW, cellH / imgH)
    setScaleX(fitScale)
    setScaleY(fitScale)
    // Center the image in the cell
    setOffsetX((cellW - imgW * fitScale) / 2)
    setOffsetY((cellH - imgH * fitScale) / 2)
  }, [image, cellW, cellH])

  // Memoized ghost canvas for overlay
  const ghostCanvas = useMemo(() => {
    if (!showGhost || !frames || !sheetSource) return null
    const ghostFrame = frames.find(f => f.id === ghostFrameId)
    if (!ghostFrame) return null
    if (ghostFrameId === targetFrameId) {
      return extractFrameCanvas(sheetSource, ghostFrame)
    }
    return getFrameCanvas(ghostFrame, sheetSource)
  }, [showGhost, frames, ghostFrameId, sheetSource, targetFrameId])

  // === Place & Scale canvas rendering ===
  useEffect(() => {
    const canvas = placeCanvasRef.current
    if (!canvas || !image || mode !== 'place') return
    const dpr = window.devicePixelRatio || 1
    const dW = Math.round(cellW * placeDisplayScale)
    const dH = Math.round(cellH * placeDisplayScale)
    canvas.width = dW * dpr
    canvas.height = dH * dpr
    canvas.style.width = dW + 'px'
    canvas.style.height = dH + 'px'
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false

    // 1) Checkerboard
    drawCheckerboard(ctx, dW, dH, Math.max(8, Math.round(8 * placeDisplayScale)))

    // 2) Ghost overlay
    if (ghostCanvas) {
      ctx.globalAlpha = ghostOpacity / 100
      ctx.drawImage(ghostCanvas, 0, 0, dW, dH)
      ctx.globalAlpha = 1
    }

    // 3) Replacement image at current scale/position
    const imgW = image.naturalWidth || image.width
    const imgH = image.naturalHeight || image.height
    const drawX = offsetX * placeDisplayScale
    const drawY = offsetY * placeDisplayScale
    const drawW = imgW * scaleX * placeDisplayScale
    const drawH = imgH * scaleY * placeDisplayScale
    ctx.drawImage(image, drawX, drawY, drawW, drawH)

    // 4) Cell boundary border
    ctx.strokeStyle = '#4a90d9'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    ctx.strokeRect(1, 1, dW - 2, dH - 2)
    ctx.setLineDash([])
  }, [image, mode, cellW, cellH, placeDisplayScale, scaleX, scaleY, offsetX, offsetY, ghostCanvas, ghostOpacity])

  // Track window size for crop display scale
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  useEffect(() => {
    let timeoutId = null
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      }, 150)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [])

  // === Crop mode canvas rendering (legacy) ===
  const cropDisplayScale = useMemo(() => {
    if (!image) return 1
    const maxW = windowSize.width * 0.7
    const maxH = windowSize.height * 0.6
    return Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight, 1)
  }, [image, windowSize])

  useEffect(() => {
    const canvas = cropCanvasRef.current
    if (!canvas || !image || mode !== 'crop') return
    const w = Math.round(image.naturalWidth * cropDisplayScale)
    const h = Math.round(image.naturalHeight * cropDisplayScale)
    canvas.width = w
    canvas.height = h
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(image, 0, 0, w, h)

    const rect = crop || (cropDragging ? {
      x: Math.min(cropDragging.startX, cropDragging.currentX),
      y: Math.min(cropDragging.startY, cropDragging.currentY),
      w: Math.abs(cropDragging.currentX - cropDragging.startX),
      h: Math.abs(cropDragging.currentY - cropDragging.startY),
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
  }, [image, cropDisplayScale, crop, cropDragging, mode])

  // === Place mode interaction: drag-to-pan ===
  const handlePlaceMouseDown = useCallback((e) => {
    if (!placeCanvasRef.current) return
    setPlaceDrag({
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    })
  }, [offsetX, offsetY])

  const handlePlaceMouseMove = useCallback((e) => {
    if (!placeDrag) return
    const dx = (e.clientX - placeDrag.startMouseX) / placeDisplayScale
    const dy = (e.clientY - placeDrag.startMouseY) / placeDisplayScale
    setOffsetX(placeDrag.startOffsetX + dx)
    setOffsetY(placeDrag.startOffsetY + dy)
  }, [placeDrag, placeDisplayScale])

  const handlePlaceMouseUp = useCallback(() => {
    setPlaceDrag(null)
  }, [])

  // Scroll wheel zoom on place canvas
  const handlePlaceWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.95 : 1.05
    setScaleX(prev => Math.max(0.1, Math.min(4, prev * delta)))
    setScaleY(prev => Math.max(0.1, Math.min(4, prev * delta)))
  }, [])

  useEffect(() => {
    const canvas = placeCanvasRef.current
    if (!canvas || mode !== 'place') return
    canvas.addEventListener('wheel', handlePlaceWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handlePlaceWheel)
  }, [handlePlaceWheel, mode])

  // === Crop mode interaction (legacy) ===
  const getCropCanvasPos = useCallback((e) => {
    const canvas = cropCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleCropMouseDown = useCallback((e) => {
    const pos = getCropCanvasPos(e)
    if (!pos) return
    setCrop(null)
    setCropDragging({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y })
  }, [getCropCanvasPos])

  const handleCropMouseMove = useCallback((e) => {
    if (!cropDragging) return
    const pos = getCropCanvasPos(e)
    if (pos) {
      setCropDragging(prev => ({ ...prev, currentX: pos.x, currentY: pos.y }))
    }
  }, [cropDragging, getCropCanvasPos])

  const handleCropMouseUp = useCallback(() => {
    if (!cropDragging) return
    const x = Math.min(cropDragging.startX, cropDragging.currentX)
    const y = Math.min(cropDragging.startY, cropDragging.currentY)
    const w = Math.abs(cropDragging.currentX - cropDragging.startX)
    const h = Math.abs(cropDragging.currentY - cropDragging.startY)
    setCropDragging(null)
    if (w > 5 && h > 5) {
      setCrop({ x, y, w, h })
    }
  }, [cropDragging])

  // Window-level drag listeners for place mode
  useEffect(() => {
    if (!placeDrag) return
    const onMove = (e) => handlePlaceMouseMove(e)
    const onUp = () => handlePlaceMouseUp()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [placeDrag, handlePlaceMouseMove, handlePlaceMouseUp])

  // Window-level drag listeners for crop mode
  useEffect(() => {
    if (!cropDragging) return
    const onMove = (e) => handleCropMouseMove(e)
    const onUp = () => handleCropMouseUp()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [cropDragging, handleCropMouseMove, handleCropMouseUp])

  // === Scale presets ===
  const imgW = image ? (image.naturalWidth || image.width) : 1
  const imgH = image ? (image.naturalHeight || image.height) : 1

  const handleFitW = useCallback(() => {
    const s = cellW / imgW
    if (lockAspect) {
      setScaleX(s)
      setScaleY(s)
      setOffsetX(0)
      setOffsetY((cellH - imgH * s) / 2)
    } else {
      setScaleX(s)
      setOffsetX(0)
    }
  }, [cellW, cellH, imgW, imgH, lockAspect])

  const handleFitH = useCallback(() => {
    const s = cellH / imgH
    if (lockAspect) {
      setScaleX(s)
      setScaleY(s)
      setOffsetX((cellW - imgW * s) / 2)
      setOffsetY(0)
    } else {
      setScaleY(s)
      setOffsetY(0)
    }
  }, [cellW, cellH, imgW, imgH, lockAspect])

  const handleFill = useCallback(() => {
    const sx = cellW / imgW
    const sy = cellH / imgH
    const s = Math.max(sx, sy)
    if (lockAspect) {
      setScaleX(s)
      setScaleY(s)
    } else {
      setScaleX(sx)
      setScaleY(sy)
    }
    setOffsetX((cellW - imgW * (lockAspect ? s : sx)) / 2)
    setOffsetY((cellH - imgH * (lockAspect ? s : sy)) / 2)
  }, [cellW, cellH, imgW, imgH, lockAspect])

  const handleCenter = useCallback(() => {
    setOffsetX((cellW - imgW * scaleX) / 2)
    setOffsetY((cellH - imgH * scaleY) / 2)
  }, [cellW, cellH, imgW, imgH, scaleX, scaleY])

  // === Apply handlers ===
  const handlePlaceApply = useCallback(() => {
    const cropResult = placeToSwapCrop(offsetX, offsetY, scaleX, scaleY, cellW, cellH)
    if (cropResult !== null) onApply(cropResult)
  }, [offsetX, offsetY, scaleX, scaleY, cellW, cellH, onApply])

  const handleCropApply = useCallback(() => {
    if (!crop) return
    onApply({
      x: Math.round(crop.x / cropDisplayScale),
      y: Math.round(crop.y / cropDisplayScale),
      w: Math.round(crop.w / cropDisplayScale),
      h: Math.round(crop.h / cropDisplayScale),
    })
  }, [crop, cropDisplayScale, onApply])

  const handleUseFullImage = useCallback(() => {
    onApply(null)
  }, [onApply])

  // Scale slider change handlers
  const handleScaleXChange = useCallback((val) => {
    const v = parseFloat(val)
    setScaleX(v)
    if (lockAspect) setScaleY(v)
  }, [lockAspect])

  const handleScaleYChange = useCallback((val) => {
    const v = parseFloat(val)
    setScaleY(v)
    if (lockAspect) setScaleX(v)
  }, [lockAspect])

  if (!image) return null

  return (
    <div className="swap-crop-overlay" onClick={onCancel}>
      <div className="swap-crop-modal swap-crop-enhanced" onClick={e => e.stopPropagation()}>
        <div className="swap-crop-header">
          <span>Replace Frame</span>
          <button className="swap-crop-close" onClick={onCancel}>&#10005;</button>
        </div>

        {/* Tabs */}
        <div className="swap-crop-tabs">
          <button className={mode === 'place' ? 'active' : ''} onClick={() => setMode('place')}>
            Place &amp; Scale
          </button>
          <button className={mode === 'crop' ? 'active' : ''} onClick={() => setMode('crop')}>
            Crop from Source
          </button>
        </div>

        {/* ====== Place & Scale Tab ====== */}
        {mode === 'place' && (
          <>
            <div className="swap-crop-canvas-wrap">
              <canvas
                ref={placeCanvasRef}
                onMouseDown={handlePlaceMouseDown}
                style={{ cursor: placeDrag ? 'grabbing' : 'grab', imageRendering: 'pixelated' }}
              />
            </div>

            <div className="swap-crop-controls">
              {/* Scale slider(s) */}
              <div className="swap-crop-scale-row">
                <label>{lockAspect ? 'Scale' : 'Width'}</label>
                <input
                  type="range"
                  min="0.1"
                  max="4"
                  step="0.01"
                  value={scaleX}
                  onChange={e => handleScaleXChange(e.target.value)}
                />
                <span className="swap-crop-scale-val">{Math.round(scaleX * 100)}%</span>
              </div>
              {!lockAspect && (
                <div className="swap-crop-scale-row">
                  <label>Height</label>
                  <input
                    type="range"
                    min="0.1"
                    max="4"
                    step="0.01"
                    value={scaleY}
                    onChange={e => handleScaleYChange(e.target.value)}
                  />
                  <span className="swap-crop-scale-val">{Math.round(scaleY * 100)}%</span>
                </div>
              )}

              {/* Lock aspect + presets */}
              <div className="swap-crop-lock-presets-row">
                <label className="swap-crop-lock-row">
                  <input
                    type="checkbox"
                    checked={lockAspect}
                    onChange={e => {
                      setLockAspect(e.target.checked)
                      if (e.target.checked) setScaleY(scaleX)
                    }}
                  />
                  Lock Aspect
                </label>
                <div className="swap-crop-presets">
                  <button onClick={handleFitW}>Fit W</button>
                  <button onClick={handleFitH}>Fit H</button>
                  <button onClick={handleFill}>Fill</button>
                  <button onClick={handleCenter}>Center</button>
                </div>
              </div>

              {/* Position */}
              <div className="swap-crop-position-row">
                <label>X</label>
                <input
                  type="number"
                  value={Math.round(offsetX)}
                  onChange={e => setOffsetX(parseFloat(e.target.value) || 0)}
                />
                <label>Y</label>
                <input
                  type="number"
                  value={Math.round(offsetY)}
                  onChange={e => setOffsetY(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Ghost overlay */}
              <div className="swap-crop-ghost-row">
                <label className="swap-crop-ghost-label">
                  <input
                    type="checkbox"
                    checked={showGhost}
                    onChange={e => setShowGhost(e.target.checked)}
                  />
                  Show Reference
                </label>
                {showGhost && (
                  <>
                    <select
                      className="swap-crop-ghost-select"
                      value={ghostFrameId}
                      onChange={e => setGhostFrameId(e.target.value)}
                    >
                      {(frames || []).map(f => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ghostOpacity}
                      onChange={e => setGhostOpacity(parseInt(e.target.value, 10))}
                    />
                    <span className="swap-crop-scale-val">{ghostOpacity}%</span>
                  </>
                )}
              </div>
            </div>

            <div className="swap-crop-actions">
              <button onClick={handleUseFullImage}>Use Full Image</button>
              <button className="swap-crop-apply" onClick={handlePlaceApply}>
                Apply
              </button>
            </div>
          </>
        )}

        {/* ====== Crop from Source Tab ====== */}
        {mode === 'crop' && (
          <>
            <div className="swap-crop-canvas-wrap">
              <canvas
                ref={cropCanvasRef}
                onMouseDown={handleCropMouseDown}
                style={{ cursor: 'crosshair' }}
              />
            </div>
            <div className="swap-crop-actions">
              <button onClick={handleUseFullImage}>Use Full Image</button>
              <button
                className="swap-crop-apply"
                onClick={handleCropApply}
                disabled={!crop}
              >
                Apply Crop
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SwapCropOverlay
