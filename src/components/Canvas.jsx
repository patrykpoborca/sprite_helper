import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { getFrameCanvas } from '../utils/frameExtract.js'

function drawCheckerboard(ctx, w, h, size = 8) {
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const isLight = ((x / size) + (y / size)) % 2 === 0
      ctx.fillStyle = isLight ? '#3a3a4a' : '#2a2a3a'
      ctx.fillRect(x, y, size, size)
    }
  }
}

function drawAnchorCrosshair(ctx, x, y, scale, color, size) {
  const s = size / scale
  ctx.strokeStyle = color
  ctx.lineWidth = 2 / scale

  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.lineTo(x + s, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y - s)
  ctx.lineTo(x, y + s)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 3 / scale, 0, Math.PI * 2)
  ctx.fill()
}

function Canvas({
  image, imgRef, imageInfo, gridConfig, frames, selectedFrameId, referenceFrameId,
  activeTool, viewMode, processedBgCanvas, alignmentData,
  onSelectFrame, onSetAnchor, onRemoveAnchor, onColorSampled, setViewMode,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [tooltip, setTooltip] = useState(null)
  const [tooltipColor, setTooltipColor] = useState(null)

  // Fit parameters
  const fitParams = useMemo(() => {
    if (!imageInfo) return null
    const { width: cw, height: ch } = canvasSize
    const iw = imageInfo.width
    const ih = imageInfo.height

    if (viewMode === 'frame') {
      const sf = frames.find(f => f.id === selectedFrameId)
      if (!sf) return null
      const fw = sf.srcW
      const fh = sf.srcH
      const scale = Math.min((cw - 40) / fw, (ch - 40) / fh, 4)
      const ox = (cw - fw * scale) / 2
      const oy = (ch - fh * scale) / 2
      return { scale, offsetX: ox, offsetY: oy, width: fw, height: fh }
    }

    if (viewMode === 'aligned') {
      const cols = gridConfig?.cols || 1
      const rows = gridConfig?.rows || 1
      const cellW = gridConfig?.cellWidth || iw
      const cellH = gridConfig?.cellHeight || ih
      const totalW = cellW * cols
      const totalH = cellH * rows
      const scale = Math.min((cw - 40) / totalW, (ch - 40) / totalH, 2)
      const ox = (cw - totalW * scale) / 2
      const oy = (ch - totalH * scale) / 2
      return { scale, offsetX: ox, offsetY: oy, width: totalW, height: totalH }
    }

    // sheet view
    const scale = Math.min((cw - 40) / iw, (ch - 40) / ih, 2)
    const ox = (cw - iw * scale) / 2
    const oy = (ch - ih * scale) / 2
    return { scale, offsetX: ox, offsetY: oy, width: iw, height: ih }
  }, [imageInfo, canvasSize, viewMode, selectedFrameId, frames, gridConfig])

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setCanvasSize({ width: Math.round(width), height: Math.round(height) })
        }
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Canvas to image coordinate helper
  const canvasToImage = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas || !fitParams) return null
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const cx = (clientX - rect.left) * dpr
    const cy = (clientY - rect.top) * dpr
    const ix = (cx - fitParams.offsetX * dpr) / (fitParams.scale * dpr)
    const iy = (cy - fitParams.offsetY * dpr) / (fitParams.scale * dpr)
    const rx = Math.round(ix)
    const ry = Math.round(iy)
    if (rx < 0 || ry < 0 || rx >= fitParams.width || ry >= fitParams.height) return null
    return { ix: rx, iy: ry }
  }, [fitParams])

  // Sample color at canvas position
  const sampleColorAt = useCallback((clientX, clientY) => {
    const pos = canvasToImage(clientX, clientY)
    if (!pos) return null
    const source = processedBgCanvas || imgRef?.current
    if (!source) return null
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 1
    tempCanvas.height = 1
    const ctx = tempCanvas.getContext('2d')
    const sw = source.naturalWidth || source.width
    const sh = source.naturalHeight || source.height
    if (pos.ix < 0 || pos.iy < 0 || pos.ix >= sw || pos.iy >= sh) return null
    ctx.drawImage(source, pos.ix, pos.iy, 1, 1, 0, 0, 1, 1)
    const pixel = ctx.getImageData(0, 0, 1, 1).data
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('')
    return hex
  }, [canvasToImage, processedBgCanvas, imgRef])

  // Find frame at image coordinates
  const frameAtCoord = useCallback((ix, iy) => {
    if (!gridConfig) return null
    for (const frame of frames) {
      if (ix >= frame.srcX && ix < frame.srcX + frame.srcW &&
          iy >= frame.srcY && iy < frame.srcY + frame.srcH) {
        return frame
      }
    }
    return null
  }, [gridConfig, frames])

  // --- Drawing ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = canvasSize.width + 'px'
    canvas.style.height = canvasSize.height + 'px'
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // Clear
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    const currentImg = imgRef?.current
    if (!imageInfo || !currentImg) return
    if (!fitParams) return

    const { scale, offsetX, offsetY } = fitParams
    ctx.imageSmoothingEnabled = scale < 1
    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)

    if (viewMode === 'sheet') {
      // Sheet view
      const source = processedBgCanvas || currentImg

      if (processedBgCanvas) {
        drawCheckerboard(ctx, imageInfo.width, imageInfo.height)
      }

      ctx.drawImage(source, 0, 0, imageInfo.width, imageInfo.height)

      // Swapped frame overlays
      for (const frame of frames) {
        if (frame.swapImage || frame.processedCanvas) {
          const src = frame.processedCanvas || frame.swapImage
          if (frame.processedCanvas) {
            ctx.save()
            ctx.translate(frame.srcX, frame.srcY)
            drawCheckerboard(ctx, frame.srcW, frame.srcH)
            ctx.restore()
          }
          if (frame.swapCrop && !frame.processedCanvas) {
            ctx.drawImage(src, frame.swapCrop.x, frame.swapCrop.y, frame.swapCrop.w, frame.swapCrop.h,
              frame.srcX, frame.srcY, frame.srcW, frame.srcH)
          } else {
            ctx.drawImage(src, 0, 0, src.width || src.naturalWidth, src.height || src.naturalHeight,
              frame.srcX, frame.srcY, frame.srcW, frame.srcH)
          }
        }
      }

      // Grid overlay
      if (gridConfig) {
        ctx.strokeStyle = 'rgba(74, 144, 217, 0.4)'
        ctx.lineWidth = 1 / scale
        ctx.setLineDash([4 / scale, 4 / scale])

        for (let r = 0; r <= gridConfig.rows; r++) {
          const y = r * gridConfig.cellHeight
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(imageInfo.width, y)
          ctx.stroke()
        }
        for (let c = 0; c <= gridConfig.cols; c++) {
          const x = c * gridConfig.cellWidth
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, imageInfo.height)
          ctx.stroke()
        }
        ctx.setLineDash([])

        // Cell numbers
        ctx.font = `${Math.max(10, 12 / scale)}px monospace`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        let num = 1
        for (let r = 0; r < gridConfig.rows; r++) {
          for (let c = 0; c < gridConfig.cols; c++) {
            const x = c * gridConfig.cellWidth + 3 / scale
            const y = r * gridConfig.cellHeight + 3 / scale
            ctx.fillStyle = 'rgba(0,0,0,0.6)'
            ctx.fillRect(x - 1 / scale, y - 1 / scale, (num.toString().length * 8 + 6) / scale, 16 / scale)
            ctx.fillStyle = 'rgba(255,255,255,0.7)'
            ctx.fillText(num, x, y)
            num++
          }
        }

        // Highlight selected cell
        if (selectedFrameId) {
          const sf = frames.find(f => f.id === selectedFrameId)
          if (sf) {
            ctx.strokeStyle = '#4a90d9'
            ctx.lineWidth = 2 / scale
            ctx.setLineDash([])
            ctx.strokeRect(sf.srcX, sf.srcY, sf.srcW, sf.srcH)
          }
        }
      }

      // Anchor crosshairs
      for (const frame of frames) {
        if (frame.anchorX !== null && frame.anchorY !== null) {
          drawAnchorCrosshair(ctx, frame.srcX + frame.anchorX, frame.srcY + frame.anchorY, scale,
            frame.isReference ? '#ff6b6b' : '#20bf6b', 10)
        }
      }

    } else if (viewMode === 'frame') {
      // Frame view
      const sf = frames.find(f => f.id === selectedFrameId)
      if (sf) {
        const fw = sf.srcW
        const fh = sf.srcH
        drawCheckerboard(ctx, fw, fh)

        const source = processedBgCanvas || currentImg
        if (sf.processedCanvas) {
          ctx.drawImage(sf.processedCanvas, 0, 0, sf.processedCanvas.width, sf.processedCanvas.height, 0, 0, fw, fh)
        } else if (sf.swapImage) {
          if (sf.swapCrop) {
            ctx.drawImage(sf.swapImage, sf.swapCrop.x, sf.swapCrop.y, sf.swapCrop.w, sf.swapCrop.h, 0, 0, fw, fh)
          } else {
            ctx.drawImage(sf.swapImage, 0, 0, sf.swapImage.naturalWidth, sf.swapImage.naturalHeight, 0, 0, fw, fh)
          }
        } else {
          ctx.drawImage(source, sf.srcX, sf.srcY, sf.srcW, sf.srcH, 0, 0, fw, fh)
        }

        if (sf.anchorX !== null && sf.anchorY !== null) {
          ctx.strokeStyle = 'rgba(32, 191, 107, 0.3)'
          ctx.lineWidth = 1 / scale
          ctx.setLineDash([4 / scale, 4 / scale])
          ctx.beginPath()
          ctx.moveTo(sf.anchorX, 0)
          ctx.lineTo(sf.anchorX, fh)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(0, sf.anchorY)
          ctx.lineTo(fw, sf.anchorY)
          ctx.stroke()
          ctx.setLineDash([])

          drawAnchorCrosshair(ctx, sf.anchorX, sf.anchorY, scale,
            sf.isReference ? '#ff6b6b' : '#20bf6b', 14)
        }

        ctx.font = `${Math.max(12, 14 / scale)}px sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        ctx.fillText(sf.label, 4 / scale, fh - 4 / scale)
      }

    } else if (viewMode === 'aligned') {
      // Aligned view
      if (gridConfig) {
        const { cellWidth, cellHeight, cols, rows } = gridConfig
        const { offsets, targetX, targetY } = alignmentData

        drawCheckerboard(ctx, cellWidth * cols, cellHeight * rows)

        const source = processedBgCanvas || currentImg
        for (const frame of frames) {
          const offset = offsets.get(frame.id) || { dx: 0, dy: 0 }
          const destX = frame.col * cellWidth + offset.dx
          const destY = frame.row * cellHeight + offset.dy

          ctx.save()
          ctx.beginPath()
          ctx.rect(frame.col * cellWidth, frame.row * cellHeight, cellWidth, cellHeight)
          ctx.clip()

          const frameCanvas = getFrameCanvas(frame, source)
          ctx.drawImage(frameCanvas, Math.round(destX), Math.round(destY))
          ctx.restore()
        }

        // Grid overlay
        ctx.strokeStyle = 'rgba(74, 144, 217, 0.3)'
        ctx.lineWidth = 1 / scale
        ctx.setLineDash([4 / scale, 4 / scale])
        for (let r = 0; r <= rows; r++) {
          const y = r * cellHeight
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(cellWidth * cols, y)
          ctx.stroke()
        }
        for (let c = 0; c <= cols; c++) {
          const x = c * cellWidth
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, cellHeight * rows)
          ctx.stroke()
        }
        ctx.setLineDash([])

        // Common anchor markers
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            drawAnchorCrosshair(ctx, c * cellWidth + targetX, r * cellHeight + targetY, scale, 'rgba(255, 107, 107, 0.5)', 8)
          }
        }
      }
    }

    ctx.restore()
  }, [canvasSize, imageInfo, image, fitParams, viewMode, frames, selectedFrameId, referenceFrameId, gridConfig, processedBgCanvas, alignmentData, imgRef])

  // --- Mouse Handlers ---
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) {
      e.preventDefault()
      if (viewMode === 'sheet' && activeTool === 'anchor') {
        const pos = canvasToImage(e.clientX, e.clientY)
        if (pos) {
          const frame = frameAtCoord(pos.ix, pos.iy)
          if (frame) onRemoveAnchor(frame.id)
        }
      } else if (viewMode === 'frame' && activeTool === 'anchor' && selectedFrameId) {
        onRemoveAnchor(selectedFrameId)
      }
      return
    }

    if (activeTool === 'eyedropper') {
      const color = sampleColorAt(e.clientX, e.clientY)
      if (color) onColorSampled(color)
      return
    }

    if (viewMode === 'sheet') {
      const pos = canvasToImage(e.clientX, e.clientY)
      if (!pos) return

      if (activeTool === 'select') {
        const frame = frameAtCoord(pos.ix, pos.iy)
        if (frame) onSelectFrame(frame.id)
      } else if (activeTool === 'anchor') {
        const frame = frameAtCoord(pos.ix, pos.iy)
        if (frame) {
          onSelectFrame(frame.id)
          setViewMode('frame')
        }
      }
    } else if (viewMode === 'frame' && activeTool === 'anchor') {
      const sf = frames.find(f => f.id === selectedFrameId)
      if (!sf) return
      const pos = canvasToImage(e.clientX, e.clientY)
      if (!pos) return
      const ax = Math.max(0, Math.min(sf.srcW, pos.ix))
      const ay = Math.max(0, Math.min(sf.srcH, pos.iy))
      onSetAnchor(sf.id, ax, ay)
    }
  }, [activeTool, viewMode, canvasToImage, frameAtCoord, frames, selectedFrameId,
      onSelectFrame, onSetAnchor, onRemoveAnchor, onColorSampled, sampleColorAt, setViewMode])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas || !fitParams) {
      setTooltip(null)
      return
    }

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (mx < 0 || my < 0 || mx > canvasSize.width || my > canvasSize.height) {
      setTooltip(null)
      return
    }

    const pos = canvasToImage(e.clientX, e.clientY)
    if (pos && pos.ix >= 0 && pos.iy >= 0 && pos.ix < fitParams.width && pos.iy < fitParams.height) {
      const color = sampleColorAt(e.clientX, e.clientY)
      setTooltipColor(color)
      setTooltip({
        x: mx + 16,
        y: my - 10,
        text: `${pos.ix}, ${pos.iy}`,
      })
    } else {
      setTooltip(null)
    }
  }, [fitParams, canvasSize, canvasToImage, sampleColorAt])

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  const cursorStyle = activeTool === 'eyedropper' ? 'crosshair'
    : activeTool === 'anchor' ? 'crosshair'
    : 'default'

  return (
    <div className="canvas-container" ref={containerRef}>
      {!image ? (
        <div className="canvas-placeholder">
          <div className="canvas-placeholder-icon">&#127912;</div>
          <div>Drop a sprite sheet here or click Load Image</div>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            style={{ cursor: cursorStyle }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onContextMenu={handleContextMenu}
          />
          {tooltip && (
            <div className="coordinate-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
              {tooltipColor && <span className="tooltip-color-swatch" style={{ background: tooltipColor }} />}
              {tooltip.text}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Canvas
