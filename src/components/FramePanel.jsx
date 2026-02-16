function FramePanel({
  frame,
  referenceFrameId,
  onSetAsReference, onClearReference,
  onDownloadFrame, onSwapUpload, onRemoveSwap,
  onUpdateFrameChromaKey, onStartEyedropper, eyedropperTarget,
}) {
  if (!frame) return null

  const isRef = frame.id === referenceFrameId
  const hasAnchor = frame.anchorX !== null && frame.anchorY !== null
  const hasSwap = !!frame.swapImage

  return (
    <div className="region-panel">
      <div className="region-panel-header">{frame.label}</div>

      {/* Anchor info */}
      <div className="region-panel-section">
        <div className="region-panel-section-title">Anchor</div>
        {hasAnchor ? (
          <div className="frame-anchor-info">
            <span className="frame-anchor-coords">x: {frame.anchorX}, y: {frame.anchorY}</span>
          </div>
        ) : (
          <div className="frame-anchor-none">No anchor set. Use the Anchor tool to place one.</div>
        )}
      </div>

      {/* Reference */}
      <div className="region-panel-section">
        <div className="region-panel-section-title">Reference</div>
        {isRef ? (
          <button className="region-panel-btn" onClick={onClearReference}>
            Clear Reference
          </button>
        ) : (
          <button className="region-panel-btn" onClick={() => onSetAsReference(frame.id)} disabled={!hasAnchor}>
            Set as Reference
          </button>
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
