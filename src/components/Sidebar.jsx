import FrameList from './FrameList.jsx'
import FramePanel from './FramePanel.jsx'
import GridConfigPanel from './GridConfigPanel.jsx'
import ChromaKeyPanel from './ChromaKeyPanel.jsx'

function Sidebar({
  sidebarTab, setSidebarTab,
  frames, selectedFrameId, referenceFrameId,
  onSelectFrame, onUpdateLabel,
  selectedFrame,
  onSetAsReference, onClearReference,
  onDownloadFrame, onSwapUpload, onRemoveSwap,
  onUpdateFrameChromaKey, onStartEyedropper, eyedropperTarget,
  gridConfig, imageInfo, onApplyGrid,
  bgChromaKey, onUpdateBgChromaKey,
  gridWarning, hasImage, sheetSource,
}) {
  return (
    <div className="annotation-sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${sidebarTab === 'frames' ? 'active' : ''}`}
          onClick={() => setSidebarTab('frames')}
        >
          Frames
        </button>
        <button
          className={`sidebar-tab ${sidebarTab === 'settings' ? 'active' : ''}`}
          onClick={() => setSidebarTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className="sidebar-tab-content">
        {sidebarTab === 'frames' ? (
          <>
            <FrameList
              frames={frames}
              selectedFrameId={selectedFrameId}
              referenceFrameId={referenceFrameId}
              onSelectFrame={onSelectFrame}
              onUpdateLabel={onUpdateLabel}
              sheetSource={sheetSource}
            />
            {selectedFrame && (
              <FramePanel
                frame={selectedFrame}
                referenceFrameId={referenceFrameId}
                onSetAsReference={onSetAsReference}
                onClearReference={onClearReference}
                onDownloadFrame={onDownloadFrame}
                onSwapUpload={onSwapUpload}
                onRemoveSwap={onRemoveSwap}
                onUpdateFrameChromaKey={onUpdateFrameChromaKey}
                onStartEyedropper={onStartEyedropper}
                eyedropperTarget={eyedropperTarget}
              />
            )}
          </>
        ) : (
          <>
            <GridConfigPanel
              gridConfig={gridConfig}
              imageInfo={imageInfo}
              onApplyGrid={onApplyGrid}
              hasImage={hasImage}
              gridWarning={gridWarning}
            />
            <ChromaKeyPanel
              chromaKey={bgChromaKey}
              onUpdate={onUpdateBgChromaKey}
              onStartEyedropper={() => onStartEyedropper('background')}
              eyedropperActive={eyedropperTarget === 'background'}
              hasImage={hasImage}
              label="Background Removal"
            />
          </>
        )}
      </div>
    </div>
  )
}

export default Sidebar
