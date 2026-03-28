function SnapPointPanel({ snapPoint, onClearSnapPoint }) {
  return (
    <div className="region-panel no-border-top">
      <div className="region-panel-header">Snap Point</div>
      <div className="region-panel-section">
        {snapPoint ? (
          <>
            <div className="frame-refpoint-info">
              <span className="frame-refpoint-coords">x: {snapPoint.x}, y: {snapPoint.y}</span>
            </div>
            <button className="region-panel-btn danger" onClick={onClearSnapPoint}>
              Clear Snap Point
            </button>
          </>
        ) : (
          <div className="frame-refpoint-none">No snap point set. Use the Snap Point tool to place one.</div>
        )}
      </div>
    </div>
  )
}

export default SnapPointPanel
