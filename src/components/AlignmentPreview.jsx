import { useRef, useState, useEffect, useMemo } from 'react'
import { computeAlignmentOffsets } from '../utils/alignment.js'
import { getFrameCanvas } from '../utils/frameExtract.js'
import { drawCheckerboard } from '../utils/canvasUtils.js'

function AlignmentPreview({ frames, gridConfig, snapPoint, sheetSource, onClose }) {
  const canvasRef = useRef(null)
  const [playing, setPlaying] = useState(true)
  const [fps, setFps] = useState(8)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [onionSkin, setOnionSkin] = useState(false)
  const animRef = useRef(null)
  const lastTimeRef = useRef(0)

  const anchoredFrames = useMemo(() => {
    const withRefPoints = frames.filter(f => f.refPointX !== null && f.refPointY !== null)
    return withRefPoints.length > 0 ? withRefPoints : frames
  }, [frames])

  const { offsets, targetX, targetY } = useMemo(() => {
    return computeAlignmentOffsets(frames, snapPoint)
  }, [frames, snapPoint])

  // Animation loop
  useEffect(() => {
    if (!playing || anchoredFrames.length === 0) return

    const interval = 1000 / fps
    const animate = (time) => {
      if (time - lastTimeRef.current >= interval) {
        lastTimeRef.current = time
        setCurrentFrame(prev => (prev + 1) % anchoredFrames.length)
      }
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [playing, fps, anchoredFrames.length])

  // Draw current frame
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !gridConfig || anchoredFrames.length === 0) return
    const { cellWidth, cellHeight } = gridConfig

    const displayScale = Math.min(300 / cellWidth, 300 / cellHeight, 4)
    const dw = Math.round(cellWidth * displayScale)
    const dh = Math.round(cellHeight * displayScale)

    canvas.width = dw
    canvas.height = dh
    canvas.style.width = dw + 'px'
    canvas.style.height = dh + 'px'

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dw, dh)

    // Checkerboard
    drawCheckerboard(ctx, dw, dh)

    ctx.save()
    ctx.scale(displayScale, displayScale)

    const source = sheetSource

    // Onion skin: draw previous frame at reduced opacity
    if (onionSkin && anchoredFrames.length > 1) {
      const prevIdx = (currentFrame - 1 + anchoredFrames.length) % anchoredFrames.length
      const prevFrame = anchoredFrames[prevIdx]
      const prevOffset = offsets.get(prevFrame.id) || { dx: 0, dy: 0 }
      const prevCanvas = getFrameCanvas(prevFrame, source)
      ctx.globalAlpha = 0.3
      ctx.drawImage(prevCanvas, Math.round(prevOffset.dx), Math.round(prevOffset.dy))
      ctx.globalAlpha = 1
    }

    // Current frame
    const frame = anchoredFrames[currentFrame % anchoredFrames.length]
    const offset = offsets.get(frame.id) || { dx: 0, dy: 0 }
    const frameCanvas = getFrameCanvas(frame, source)
    ctx.drawImage(frameCanvas, Math.round(offset.dx), Math.round(offset.dy))

    // Snap point marker
    if (snapPoint) {
      ctx.strokeStyle = 'rgba(230, 168, 23, 0.6)'
      ctx.lineWidth = 1
      const s = 4
      ctx.beginPath()
      ctx.moveTo(targetX, targetY - s)
      ctx.lineTo(targetX + s, targetY)
      ctx.lineTo(targetX, targetY + s)
      ctx.lineTo(targetX - s, targetY)
      ctx.closePath()
      ctx.stroke()
    }

    ctx.restore()
  }, [currentFrame, anchoredFrames, offsets, targetX, targetY, gridConfig, sheetSource, onionSkin, snapPoint])

  if (frames.length === 0) {
    return (
      <div className="preview-overlay" onClick={onClose}>
        <div className="preview-container" onClick={e => e.stopPropagation()}>
          <div className="preview-header">
            <span>Animation Preview</span>
            <button className="preview-close" onClick={onClose}>&#10005;</button>
          </div>
          <div className="preview-empty">No frames to preview. Set up a grid first.</div>
          <div className="preview-actions">
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-container preview-modal" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <span>Animation Preview — {anchoredFrames[currentFrame % anchoredFrames.length]?.label}</span>
          <button className="preview-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="preview-canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
        <div className="preview-controls">
          <button className="region-panel-btn" onClick={() => setPlaying(!playing)}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <label className="preview-fps">
            FPS: {fps}
            <input
              type="range"
              min="1"
              max="30"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
            />
          </label>
          <label className="region-panel-toggle">
            <input
              type="checkbox"
              checked={onionSkin}
              onChange={(e) => setOnionSkin(e.target.checked)}
            />
            Onion skin
          </label>
          <span className="preview-frame-counter">
            {(currentFrame % anchoredFrames.length) + 1} / {anchoredFrames.length}
          </span>
        </div>
        <div className="preview-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default AlignmentPreview
