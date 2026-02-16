function ChromaKeyPanel({ chromaKey, onUpdate, onStartEyedropper, eyedropperActive, hasImage, label }) {
  return (
    <div className="bg-chroma-panel">
      <div className="bg-chroma-header">{label}</div>
      <label className="region-panel-toggle">
        <input
          type="checkbox"
          checked={!!chromaKey}
          onChange={(e) => {
            if (e.target.checked) {
              onUpdate({ color: '#ffffff', tolerance: 20 })
            } else {
              onUpdate(null)
            }
          }}
          disabled={!hasImage}
        />
        Enable background removal
      </label>
      {chromaKey && (
        <div className="chroma-controls">
          <div className="chroma-color-row">
            <input
              type="color"
              value={chromaKey.color}
              onChange={(e) => onUpdate({ ...chromaKey, color: e.target.value })}
            />
            <input
              className="chroma-hex-input"
              value={chromaKey.color}
              onChange={(e) => {
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                  onUpdate({ ...chromaKey, color: e.target.value })
                }
              }}
            />
            <button
              className={`region-panel-btn sample-btn ${eyedropperActive ? 'active' : ''}`}
              onClick={onStartEyedropper}
            >
              Sample
            </button>
          </div>
          <div className="chroma-tolerance-row">
            <label>Tolerance: {chromaKey.tolerance}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={chromaKey.tolerance}
              onChange={(e) => onUpdate({ ...chromaKey, tolerance: Number(e.target.value) })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ChromaKeyPanel
