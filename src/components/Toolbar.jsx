function Toolbar({
  activeTool, setActiveTool,
  viewMode, setViewMode,
  hasImage, hasGrid, hasFrames, hasAlignmentData,
  onLoadImage, onExport, onSave, onLoad, onPreview,
  eyedropperTarget,
}) {
  return (
    <div className="toolbar">
      <span className="toolbar-title">Sprite Magic</span>
      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button onClick={onLoadImage} title="Load a sprite sheet image from your computer">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="12" height="12" rx="2" />
            <circle cx="5" cy="5" r="1.5" />
            <path d="M1 10l3-3 2 2 3-4 4 5" />
          </svg>
          Load Image
        </button>
        <button onClick={onLoad} title="Open a saved .spritemagic project file">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2h4l1 1h5v9H2z" />
          </svg>
          Open Project
        </button>
      </div>
      <div className="toolbar-divider" />

      {/* Tools */}
      <div className="toolbar-group">
        <button
          className={activeTool === 'select' ? 'active' : ''}
          onClick={() => setActiveTool('select')}
          disabled={!hasImage}
          title="Select and inspect frames"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 1l4 12 1.5-4.5L12 7z" />
          </svg>
          Select
        </button>
        <button
          className={activeTool === 'snapPoint' ? 'active' : ''}
          onClick={() => setActiveTool('snapPoint')}
          disabled={!hasGrid}
          title="Set the alignment target point (shared across cells)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 1l3 6-3 6-3-6z" />
            <circle cx="7" cy="7" r="1.5" />
          </svg>
          Snap Point
        </button>
        <button
          className={activeTool === 'refPoint' ? 'active' : ''}
          onClick={() => setActiveTool('refPoint')}
          disabled={!hasGrid}
          title="Mark a reference feature on each frame for alignment"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="5" r="2" />
            <path d="M7 7v5M4 10h6" />
            <path d="M7 1v2M7 10v2" />
          </svg>
          Ref Point
        </button>
        <button
          className={`${activeTool === 'eyedropper' ? 'active' : ''} ${eyedropperTarget ? 'sampling' : ''}`}
          onClick={() => setActiveTool('eyedropper')}
          disabled={!hasImage}
          title="Sample a pixel color for chroma-key removal"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 1l3 3-8 8H2v-3z" />
            <path d="M8 3l3 3" />
          </svg>
          Eyedropper
        </button>
      </div>
      <div className="toolbar-divider" />

      {/* Views */}
      <div className="toolbar-group">
        <button
          className={viewMode === 'sheet' ? 'active' : ''}
          onClick={() => setViewMode('sheet')}
          disabled={!hasImage}
          title="View the full sprite sheet with grid overlay"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="5" height="5" />
            <rect x="8" y="1" width="5" height="5" />
            <rect x="1" y="8" width="5" height="5" />
            <rect x="8" y="8" width="5" height="5" />
          </svg>
          Sheet
        </button>
        <button
          className={viewMode === 'frame' ? 'active' : ''}
          onClick={() => setViewMode('frame')}
          disabled={!hasFrames}
          title="View the selected frame zoomed in"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="10" height="10" rx="1" />
            <path d="M7 4v6M4 7h6" />
          </svg>
          Frame
        </button>
        <button
          className={viewMode === 'aligned' ? 'active' : ''}
          onClick={() => setViewMode('aligned')}
          disabled={!hasAlignmentData}
          title="Preview frames aligned by snap and reference points"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 1v12" strokeDasharray="2 1" />
            <rect x="2" y="3" width="4" height="4" />
            <rect x="8" y="4" width="4" height="4" />
          </svg>
          Aligned
        </button>
      </div>
      <div className="toolbar-divider" />

      {/* Actions */}
      <div className="toolbar-group">
        <button onClick={onPreview} disabled={!hasFrames} title="Animate frames with alignment applied">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="3,1 12,7 3,13" />
          </svg>
          Preview
        </button>
        <button onClick={onExport} disabled={!hasFrames} title="Export aligned sprite sheet as PNG">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 1v8M4 6l3 3 3-3" />
            <path d="M1 10v2h12v-2" />
          </svg>
          Export
        </button>
        <button onClick={onSave} disabled={!hasImage} title="Save project as .spritemagic file">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 1h8l3 3v8a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z" />
            <rect x="4" y="8" width="6" height="4" />
            <path d="M4 1v3h5V1" />
          </svg>
          Save
        </button>
      </div>
    </div>
  )
}

export default Toolbar
