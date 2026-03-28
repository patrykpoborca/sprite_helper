import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import Toolbar from './components/Toolbar.jsx'
import Canvas from './components/Canvas.jsx'
import Sidebar from './components/Sidebar.jsx'
import AlignmentPreview from './components/AlignmentPreview.jsx'
import SwapCropOverlay from './components/SwapCropOverlay.jsx'
import { useImageLoading } from './hooks/useImageLoading.js'
import { useGridAndFrames } from './hooks/useGridAndFrames.js'
import { useAlignment } from './hooks/useAlignment.js'
import { useChromaKey } from './hooks/useChromaKey.js'
import { useFrameSwap } from './hooks/useFrameSwap.js'
import { useProjectIO } from './hooks/useProjectIO.js'

function App() {
  // --- Core state (shared across hooks) ---
  const [image, setImage] = useState(null)
  const [imageInfo, setImageInfo] = useState(null)
  const [baseImage, setBaseImage] = useState(null)
  const imgRef = useRef(null)

  const [gridConfig, setGridConfig] = useState(null)
  const [frames, setFrames] = useState([])
  const [selectedFrameId, setSelectedFrameId] = useState(null)
  const [snapPoint, setSnapPoint] = useState(null)

  const [activeTool, setActiveTool] = useState('select')
  const [viewMode, setViewMode] = useState('sheet')

  const [bgChromaKey, setBgChromaKey] = useState(null)
  const [processedBgCanvas, setProcessedBgCanvas] = useState(null)
  const [eyedropperTarget, setEyedropperTarget] = useState(null)

  const [sidebarTab, setSidebarTab] = useState('frames')
  const [showAlignmentPreview, setShowAlignmentPreview] = useState(false)
  const [swapCropState, setSwapCropState] = useState(null)

  // --- Snap Point handlers ---
  const handleSetSnapPoint = useCallback((x, y) => {
    setSnapPoint({ x, y })
  }, [])

  const handleClearSnapPoint = useCallback(() => {
    setSnapPoint(null)
  }, [])

  // --- Hooks ---
  const {
    nextFrameIdRef,
    selectedFrameIndex,
    selectedFrame,
    applyGrid,
    selectFrame,
    selectPrevFrame,
    selectNextFrame,
    updateFrameLabel,
    gridWarning,
  } = useGridAndFrames({
    imageInfo, frames, setFrames, gridConfig, setGridConfig,
    selectedFrameId, setSelectedFrameId, setSnapPoint,
  })

  const {
    fileInputRef,
    handleImageLoad,
    handleFileSelect,
    handleDrop: imageHandleDrop,
    handleDragOver,
  } = useImageLoading({
    setImage, setImageInfo, setBaseImage, imgRef,
    setGridConfig, setFrames, setSelectedFrameId, setSnapPoint,
    setViewMode, setActiveTool, setBgChromaKey, setProcessedBgCanvas,
    nextFrameIdRef,
  })

  const {
    alignmentData,
    setFrameSnapPoint,
    clearFrameSnapPoint,
    setFrameRefPoint,
    removeFrameRefPoint,
    hasAlignmentData,
  } = useAlignment({
    frames, setFrames, snapPoint, setSelectedFrameId, setViewMode,
  })

  const {
    updateBgChromaKey,
    startEyedropper,
    handleColorSampled,
    updateFrameChromaKey,
  } = useChromaKey({
    imgRef, selectedFrame, setFrames, setActiveTool,
    bgChromaKey, setBgChromaKey, processedBgCanvas, setProcessedBgCanvas,
    eyedropperTarget, setEyedropperTarget,
  })

  const {
    swapInputRef,
    handleSwapUpload,
    handleSwapFileSelect,
    handleSwapCropApply,
    removeSwap,
  } = useFrameSwap({ setFrames, swapCropState, setSwapCropState })

  const {
    projectInputRef,
    projectDropRef,
    handleExport,
    handleSaveProject,
    handleProjectFileSelect,
    downloadFrame,
  } = useProjectIO({
    imageInfo, imgRef, frames, gridConfig, snapPoint, bgChromaKey,
    processedBgCanvas,
    setImage, setImageInfo, setBaseImage,
    setGridConfig, setFrames, setSelectedFrameId, setSnapPoint,
    setBgChromaKey, setProcessedBgCanvas,
    setViewMode, setActiveTool,
    nextFrameIdRef,
  })

  // --- Drag & drop wrapper (routes to image load or project load) ---
  const handleDrop = useCallback((e) => {
    imageHandleDrop(e, projectDropRef)
  }, [imageHandleDrop, projectDropRef])

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key === 'Escape') {
        if (eyedropperTarget) {
          setEyedropperTarget(null)
          setActiveTool('select')
        } else if (swapCropState) {
          setSwapCropState(null)
        }
      } else if (e.key === 'ArrowLeft' && viewMode === 'frame' && frames.length > 0) {
        e.preventDefault()
        selectPrevFrame()
      } else if (e.key === 'ArrowRight' && viewMode === 'frame' && frames.length > 0) {
        e.preventDefault()
        selectNextFrame()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [eyedropperTarget, swapCropState, viewMode, frames.length, selectPrevFrame, selectNextFrame])

  const sheetSource = processedBgCanvas || baseImage

  return (
    <div className="app" onDrop={handleDrop} onDragOver={handleDragOver}>
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        viewMode={viewMode}
        setViewMode={setViewMode}
        hasImage={!!image}
        hasGrid={!!gridConfig}
        hasFrames={frames.length > 0}
        hasAlignmentData={hasAlignmentData}
        onLoadImage={() => fileInputRef.current?.click()}
        onExport={handleExport}
        onSave={handleSaveProject}
        onLoad={() => projectInputRef.current?.click()}
        onPreview={() => setShowAlignmentPreview(true)}
        eyedropperTarget={eyedropperTarget}
      />
      <div className="main-content">
        <Canvas
          image={image}
          imageElement={baseImage}
          imageInfo={imageInfo}
          gridConfig={gridConfig}
          frames={frames}
          selectedFrameId={selectedFrameId}
          snapPoint={snapPoint}
          activeTool={activeTool}
          viewMode={viewMode}
          processedBgCanvas={processedBgCanvas}
          alignmentData={alignmentData}
          onSelectFrame={selectFrame}
          onSetSnapPoint={handleSetSnapPoint}
          onClearSnapPoint={handleClearSnapPoint}
          onSetRefPoint={setFrameRefPoint}
          onRemoveRefPoint={removeFrameRefPoint}
          onSetFrameSnapPoint={setFrameSnapPoint}
          onClearFrameSnapPoint={clearFrameSnapPoint}
          onColorSampled={handleColorSampled}
          setViewMode={setViewMode}
          onPrevFrame={selectPrevFrame}
          onNextFrame={selectNextFrame}
        />
        <Sidebar
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={selectFrame}
          onUpdateLabel={updateFrameLabel}
          selectedFrame={selectedFrame}
          onDownloadFrame={downloadFrame}
          onSwapUpload={handleSwapUpload}
          onRemoveSwap={removeSwap}
          onUpdateFrameChromaKey={updateFrameChromaKey}
          onStartEyedropper={startEyedropper}
          eyedropperTarget={eyedropperTarget}
          gridConfig={gridConfig}
          imageInfo={imageInfo}
          onApplyGrid={applyGrid}
          bgChromaKey={bgChromaKey}
          onUpdateBgChromaKey={updateBgChromaKey}
          gridWarning={gridWarning}
          hasImage={!!image}
          sheetSource={sheetSource}
          snapPoint={snapPoint}
          onClearSnapPoint={handleClearSnapPoint}
          onClearFrameSnapPoint={clearFrameSnapPoint}
        />
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
      <input ref={projectInputRef} type="file" accept=".spritemagic" style={{ display: 'none' }} onChange={handleProjectFileSelect} />
      <input ref={swapInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSwapFileSelect} />

      {/* Modals */}
      {showAlignmentPreview && (
        <AlignmentPreview
          frames={frames}
          gridConfig={gridConfig}
          snapPoint={snapPoint}
          sheetSource={sheetSource}
          onClose={() => setShowAlignmentPreview(false)}
        />
      )}
      {swapCropState && (
        <SwapCropOverlay
          image={swapCropState.image}
          targetCellWidth={gridConfig?.cellWidth}
          targetCellHeight={gridConfig?.cellHeight}
          frames={frames}
          targetFrameId={swapCropState.frameId}
          sheetSource={sheetSource}
          onApply={handleSwapCropApply}
          onCancel={() => setSwapCropState(null)}
        />
      )}
    </div>
  )
}

export default App
