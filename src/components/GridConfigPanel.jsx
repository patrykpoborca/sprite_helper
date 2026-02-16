import { useState, useCallback } from 'react'

function GridConfigPanel({ gridConfig, imageInfo, onApplyGrid, hasImage, gridWarning }) {
  const [rows, setRows] = useState(gridConfig?.rows || 4)
  const [cols, setCols] = useState(gridConfig?.cols || 4)

  const handleApply = useCallback(() => {
    const r = Math.max(1, Math.min(64, rows))
    const c = Math.max(1, Math.min(64, cols))
    onApplyGrid(r, c)
  }, [rows, cols, onApplyGrid])

  return (
    <div className="grid-config-panel">
      <div className="region-panel-section-title">Grid Configuration</div>
      <div className="grid-config-inputs">
        <label className="grid-config-label">
          Rows
          <input
            type="number"
            min="1"
            max="64"
            value={rows}
            onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={!hasImage}
          />
        </label>
        <span className="grid-config-x">&times;</span>
        <label className="grid-config-label">
          Cols
          <input
            type="number"
            min="1"
            max="64"
            value={cols}
            onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={!hasImage}
          />
        </label>
      </div>
      {imageInfo && (
        <div className="grid-config-info">
          Cell size: {Math.floor(imageInfo.width / cols)} &times; {Math.floor(imageInfo.height / rows)} px
        </div>
      )}
      {gridWarning && (
        <div className="grid-config-warning">
          Image dimensions not evenly divisible by grid. Some pixels may be clipped.
        </div>
      )}
      <button className="region-panel-btn" onClick={handleApply} disabled={!hasImage}>
        Apply Grid
      </button>
    </div>
  )
}

export default GridConfigPanel
