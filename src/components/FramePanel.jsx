function FramePanel({
  frame,
  onDownloadFrame, onSwapUpload, onRemoveSwap,
  onUpdateFrameChromaKey, onStartEyedropper, eyedropperTarget,
  onClearFrameSnapPoint,
}) {
  if (!frame) return null

  const hasRefPoint = frame.refPointX !== null && frame.refPointY !== null
  const hasSwap = !!frame.swapImage
  const hasSnapOverride = frame.snapPointX != null

  return (
    <div className="region-panel">
      <div className="region-panel-header">{frame.label}</div>

      {/* Snap Point Override info */}
      <div className="region-panel-section">
        <div className="region-panel-section-title">Snap Point</div>
        {hasSnapOverride ? (
          <div className="frame-refpoint-info">
            <span className="frame-snap-delinked-badge">Overridden</span>
            <span className="frame-refpoint-coords warning">
              x: {frame.snapPointX}, y: {frame.snapPointY}
            </span>
            <button className="region-panel-btn relink-btn" onClick={() => onClearFrameSnapPoint(frame.id)}>
              Re-link to Global
            </button>
          </div>
        ) : (
          <div className="frame-refpoint-none">Linked to global snap point.</div>
        )}
      </div>

      {/* Reference Point info */}
      <div className="region-panel-section">
        <div className="region-panel-section-title">Reference Point</div>
        {hasRefPoint ? (
          <div className="frame-refpoint-info">
            <span className="frame-refpoint-coords">x: {frame.refPointX}, y: {frame.refPointY}</span>
          </div>
        ) : (
          <div className="frame-refpoint-none">No reference point set. Use the Ref Point tool to mark a feature.</div>
        )}
      </div>

      {/* Swap */}
      <div className="region-panel-section">
        <div className="region-panel-section-title">Frame Swap</div>
        <div className="region-panel-actions">
          <button className="region-panel-btn" onClick={() => onDownloadFrame(frame.id)}>
            Download
          </button>
          <button className="region-panel-btn" onClick={() => onSwapUpload(frame.id)}>
            Upload
          </button>
        </div>
        {hasSwap && (
          <button className="region-panel-btn danger" onClick={() => onRemoveSwap(frame.id)}>
            Remove Swap
          </button>
        )}
      </div>

      {/* Per-frame chroma key (when swap exists) */}
      {hasSwap && (
        <div className="region-panel-section">
          <div className="region-panel-section-title">Frame Chroma Key</div>
          <label className="region-panel-toggle">
            <input
              type="checkbox"
              checked={!!frame.chromaKey}
              onChange={(e) => {
                if (e.target.checked) {
                  onUpdateFrameChromaKey(frame.id, { color: '#ffffff', tolerance: 20 })
                } else {
                  onUpdateFrameChromaKey(frame.id, null)
                }
              }}
            />
            Enable chroma key
          </label>
          {frame.chromaKey && (
            <div className="chroma-controls">
              <div className="chroma-color-row">
                <input
                  type="color"
                  value={frame.chromaKey.color}
                  onChange={(e) => onUpdateFrameChromaKey(frame.id, { ...frame.chromaKey, color: e.target.value })}
                />
                <input
                  className="chroma-hex-input"
                  value={frame.chromaKey.color}
                  onChange={(e) => {
                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                      onUpdateFrameChromaKey(frame.id, { ...frame.chromaKey, color: e.target.value })
                    }
                  }}
                />
                <button
                  className={`region-panel-btn sample-btn ${eyedropperTarget === 'frame' ? 'active' : ''}`}
                  onClick={() => onStartEyedropper('frame')}
                >
                  Sample
                </button>
              </div>
              <div className="chroma-tolerance-row">
                <label>Tolerance: {frame.chromaKey.tolerance}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={frame.chromaKey.tolerance}
                  onChange={(e) => onUpdateFrameChromaKey(frame.id, { ...frame.chromaKey, tolerance: Number(e.target.value) })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FramePanel
