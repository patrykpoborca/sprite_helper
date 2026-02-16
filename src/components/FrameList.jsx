import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { generateThumbnail } from '../utils/frameExtract.js'

function FrameList({ frames, selectedFrameId, referenceFrameId, onSelectFrame, onUpdateLabel, sheetSource }) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const editRef = useRef(null)

  // Generate thumbnails
  const thumbnails = useMemo(() => {
    if (!sheetSource || !frames.length) return {}
    const map = {}
    for (const frame of frames) {
      try {
        map[frame.id] = generateThumbnail(sheetSource, frame, 36)
      } catch {
        map[frame.id] = null
      }
    }
    return map
  }, [frames, sheetSource])

  const startEdit = useCallback((e, frame) => {
    e.stopPropagation()
    setEditingId(frame.id)
    setEditValue(frame.label)
  }, [])

  const commitEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      onUpdateLabel(editingId, editValue.trim())
    }
    setEditingId(null)
  }, [editingId, editValue, onUpdateLabel])

  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingId(null)
  }, [commitEdit])

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editingId])

  if (!frames.length) {
    return <div className="sidebar-empty">No frames yet. Set up a grid in Settings.</div>
  }

  return (
    <div className="frame-list">
      {frames.map((frame) => {
        const isSelected = frame.id === selectedFrameId
        const isRef = frame.id === referenceFrameId
        const hasAnchor = frame.anchorX !== null && frame.anchorY !== null
        const hasSwap = !!frame.swapImage

        return (
          <div
            key={frame.id}
            className={`frame-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectFrame(frame.id)}
          >
            <div className="frame-thumb">
              {thumbnails[frame.id] ? (
                <img src={thumbnails[frame.id]} alt={frame.label} />
              ) : (
                <div className="frame-thumb-placeholder">{frame.id.replace(/\D/g, '')}</div>
              )}
            </div>
            <div className="frame-info">
              {editingId === frame.id ? (
                <input
                  ref={editRef}
                  className="annotation-label-edit"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleEditKeyDown}
                />
              ) : (
                <div className="frame-label" onDoubleClick={(e) => startEdit(e, frame)}>
                  {frame.label}
                </div>
              )}
              <div className="frame-status-row">
                {hasAnchor && <span className="frame-status-dot anchored" title="Anchor set" />}
                {isRef && <span className="frame-status-dot reference" title="Reference frame" />}
                {hasSwap && <span className="frame-status-dot swapped" title="Frame swapped" />}
                {!hasAnchor && <span className="frame-status-dot empty" title="No anchor" />}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FrameList
