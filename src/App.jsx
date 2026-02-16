import { useState, useRef, useCallback, useMemo } from 'react'
import './App.css'
import Toolbar from './components/Toolbar.jsx'
import Canvas from './components/Canvas.jsx'
import Sidebar from './components/Sidebar.jsx'
import AlignmentPreview from './components/AlignmentPreview.jsx'
import SwapCropOverlay from './components/SwapCropOverlay.jsx'
import { applyChromaKey } from './utils/chromaKey.js'
import { computeAlignmentOffsets } from './utils/alignment.js'
import { exportAlignedSheet, downloadCanvas } from './utils/spriteExport.js'
import { extractFrameCanvas } from './utils/frameExtract.js'
import { saveProject, loadProject } from './utils/projectFile.js'

function App() {
  // Image state
  const [image, setImage] = useState(null)
  const [imageInfo, setImageInfo] = useState(null)
  const [baseImage, setBaseImage] = useState(null)
  const imgRef = useRef(null)

  // Grid & frames
  const [gridConfig, setGridConfig] = useState(null)
  const [frames, setFrames] = useState([])
  const [selectedFrameId, setSelectedFrameId] = useState(null)
  const [referenceFrameId, setReferenceFrameId] = useState(null)

  // Tools & views
  const [activeTool, setActiveTool] = useState('select')
  const [viewMode, setViewMode] = useState('sheet')

  // Chroma key
  const [bgChromaKey, setBgChromaKey] = useState(null)
  const [processedBgCanvas, setProcessedBgCanvas] = useState(null)
  const [eyedropperTarget, setEyedropperTarget] = useState(null) // 'background' | 'frame' | null

  // Sidebar
  const [sidebarTab, setSidebarTab] = useState('frames')

  // Preview
  const [showAlignmentPreview, setShowAlignmentPreview] = useState(false)

  // Swap crop overlay
  const [swapCropState, setSwapCropState] = useState(null) // { frameId, image }

  // File input refs
  const fileInputRef = useRef(null)
  const projectInputRef = useRef(null)
  const swapInputRef = useRef(null)
  const nextFrameIdRef = useRef(1)
  const swapTargetFrameRef = useRef(null)

  // Computed alignment offsets
  const alignmentData = useMemo(() => {
    if (!frames.length || !gridConfig) return { offsets: new Map(), targetX: 0, targetY: 0 }
    return computeAlignmentOffsets(frames, referenceFrameId)
  }, [frames, referenceFrameId, gridConfig])

  const selectedFrame = useMemo(() => {
    return frames.find(f => f.id === selectedFrameId) || null
  }, [frames, selectedFrameId])

  const sheetSource = processedBgCanvas || baseImage

  // --- Image Loading ---
  const handleImageLoad = useCallback((file) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setBaseImage(img)
      setImage(url)
      setImageInfo({ filename: file.name, width: img.naturalWidth, height: img.naturalHeight })
      setGridConfig(null)
      setFrames([])
      setSelectedFrameId(null)
      setReferenceFrameId(null)
      setViewMode('sheet')
      setActiveTool('select')
      setBgChromaKey(null)
      setProcessedBgCanvas(null)
      nextFrameIdRef.current = 1
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageLoad(file)
    }
  }, [handleImageLoad])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleImageLoad(file)
    e.target.value = ''
  }, [handleImageLoad])

  // --- Grid Configuration ---
  const applyGrid = useCallback((rows, cols) => {
    if (!imageInfo) return
    const cellWidth = Math.floor(imageInfo.width / cols)
    const cellHeight = Math.floor(imageInfo.height / rows)
    const config = { rows, cols, cellWidth, cellHeight }
    setGridConfig(config)

    const newFrames = []
    nextFrameIdRef.current = 1
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newFrames.push({
          id: `f${nextFrameIdRef.current}`,
          row: r,
          col: c,
          label: `Frame ${nextFrameIdRef.current}`,
          srcX: c * cellWidth,
          srcY: r * cellHeight,
          srcW: cellWidth,
          srcH: cellHeight,
          anchorX: null,
          anchorY: null,
          isReference: false,
          swapImage: null,
          swapCrop: null,
          chromaKey: null,
          processedCanvas: null,
        })
        nextFrameIdRef.current++
      }
    }
    setFrames(newFrames)
    setSelectedFrameId(null)
    setReferenceFrameId(null)
  }, [imageInfo])

  // --- Frame Selection ---
  const selectFrame = useCallback((frameId) => {
    setSelectedFrameId(frameId)
  }, [])

  // --- Anchor Placement ---
  const setFrameAnchor = useCallback((frameId, anchorX, anchorY) => {
    setFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, anchorX, anchorY } : f
    ))
  }, [])

  const removeFrameAnchor = useCallback((frameId) => {
    setFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, anchorX: null, anchorY: null } : f
    ))
  }, [])

  // --- Reference Frame ---
  const setAsReference = useCallback((frameId) => {
    setReferenceFrameId(frameId)
    setFrames(prev => prev.map(f => ({
      ...f,
      isReference: f.id === frameId,
    })))
  }, [])

  const clearReference = useCallback(() => {
    setReferenceFrameId(null)
    setFrames(prev => prev.map(f => ({ ...f, isReference: false })))
  }, [])

  // --- Frame Label ---
  const updateFrameLabel = useCallback((frameId, label) => {
    setFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, label } : f
    ))
  }, [])

  // --- Background Chroma Key ---
  const updateBgChromaKey = useCallback((settings) => {
    if (!settings) {
      setBgChromaKey(null)
      setProcessedBgCanvas(null)
      return
    }
    setBgChromaKey(settings)
    if (imgRef.current) {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = imgRef.current.naturalWidth
      tempCanvas.height = imgRef.current.naturalHeight
      const ctx = tempCanvas.getContext('2d')
      ctx.drawImage(imgRef.current, 0, 0)
      const processed = applyChromaKey(tempCanvas, settings.color, settings.tolerance)
      setProcessedBgCanvas(processed)
    }
  }, [])

  // --- Eyedropper ---
  const startEyedropper = useCallback((target) => {
    setEyedropperTarget(target)
    setActiveTool('eyedropper')
  }, [])

  const handleColorSampled = useCallback((hexColor) => {
    if (eyedropperTarget === 'background') {
      const settings = bgChromaKey || { color: hexColor, tolerance: 20 }
      updateBgChromaKey({ ...settings, color: hexColor })
    } else if (eyedropperTarget === 'frame' && selectedFrame) {
      const settings = selectedFrame.chromaKey || { color: hexColor, tolerance: 20 }
      setFrames(prev => prev.map(f => {
        if (f.id !== selectedFrame.id) return f
        const newChromaKey = { ...settings, color: hexColor }
        let processedCanvas = null
        if (f.swapImage) {
          const tempCanvas = document.createElement('canvas')
          const sw = f.swapCrop ? f.swapCrop.w : (f.swapImage.naturalWidth || f.swapImage.width)
          const sh = f.swapCrop ? f.swapCrop.h : (f.swapImage.naturalHeight || f.swapImage.height)
          tempCanvas.width = sw
          tempCanvas.height = sh
          const ctx = tempCanvas.getContext('2d')
          if (f.swapCrop) {
            ctx.drawImage(f.swapImage, f.swapCrop.x, f.swapCrop.y, f.swapCrop.w, f.swapCrop.h, 0, 0, sw, sh)
          } else {
            ctx.drawImage(f.swapImage, 0, 0)
          }
          processedCanvas = applyChromaKey(tempCanvas, newChromaKey.color, newChromaKey.tolerance)
        }
        return { ...f, chromaKey: newChromaKey, processedCanvas }
      }))
    }
    setEyedropperTarget(null)
    setActiveTool('select')
  }, [eyedropperTarget, bgChromaKey, selectedFrame, updateBgChromaKey])

  // --- Frame Swap ---
  const handleSwapUpload = useCallback((frameId) => {
    swapTargetFrameRef.current = frameId
    swapInputRef.current?.click()
  }, [])

  const handleSwapFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    const frameId = swapTargetFrameRef.current
    if (!file || !frameId) return
    e.target.value = ''

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setSwapCropState({ frameId, image: img })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [])

  const handleSwapCropApply = useCallback((crop) => {
    if (!swapCropState) return
    setFrames(prev => prev.map(f => {
      if (f.id !== swapCropState.frameId) return f
      const updated = { ...f, swapImage: swapCropState.image, swapCrop: crop }
      if (f.chromaKey) {
        const sw = crop ? crop.w : (swapCropState.image.naturalWidth || swapCropState.image.width)
        const sh = crop ? crop.h : (swapCropState.image.naturalHeight || swapCropState.image.height)
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = sw
        tempCanvas.height = sh
        const ctx = tempCanvas.getContext('2d')
        if (crop) {
          ctx.drawImage(swapCropState.image, crop.x, crop.y, crop.w, crop.h, 0, 0, sw, sh)
        } else {
          ctx.drawImage(swapCropState.image, 0, 0)
        }
        updated.processedCanvas = applyChromaKey(tempCanvas, f.chromaKey.color, f.chromaKey.tolerance)
      }
      return updated
    }))
    setSwapCropState(null)
  }, [swapCropState])

  const handleSwapCropFullImage = useCallback(() => {
    if (!swapCropState) return
    handleSwapCropApply(null)
  }, [swapCropState, handleSwapCropApply])

  const removeSwap = useCallback((frameId) => {
    setFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, swapImage: null, swapCrop: null, chromaKey: null, processedCanvas: null } : f
    ))
  }, [])

  // --- Per-Frame Chroma Key ---
  const updateFrameChromaKey = useCallback((frameId, settings) => {
    setFrames(prev => prev.map(f => {
      if (f.id !== frameId) return f
      if (!settings) {
        return { ...f, chromaKey: null, processedCanvas: null }
      }
      let processedCanvas = null
      if (f.swapImage) {
        const sw = f.swapCrop ? f.swapCrop.w : (f.swapImage.naturalWidth || f.swapImage.width)
        const sh = f.swapCrop ? f.swapCrop.h : (f.swapImage.naturalHeight || f.swapImage.height)
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = sw
        tempCanvas.height = sh
        const ctx = tempCanvas.getContext('2d')
        if (f.swapCrop) {
          ctx.drawImage(f.swapImage, f.swapCrop.x, f.swapCrop.y, f.swapCrop.w, f.swapCrop.h, 0, 0, sw, sh)
        } else {
          ctx.drawImage(f.swapImage, 0, 0)
        }
        processedCanvas = applyChromaKey(tempCanvas, settings.color, settings.tolerance)
      }
      return { ...f, chromaKey: settings, processedCanvas }
    }))
  }, [])

  // --- Frame Download ---
  const downloadFrame = useCallback((frameId) => {
    const frame = frames.find(f => f.id === frameId)
    if (!frame || !imgRef.current) return
    const source = processedBgCanvas || imgRef.current
    const canvas = extractFrameCanvas(source, frame)
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `${frame.label.replace(/\s+/g, '_')}.png`
    link.click()
  }, [frames, processedBgCanvas])

  // --- Export ---
  const handleExport = useCallback(() => {
    if (!frames.length || !gridConfig || !imgRef.current) return
    const source = processedBgCanvas || imgRef.current
    const outCanvas = exportAlignedSheet(frames, referenceFrameId, gridConfig, source)
    const baseName = imageInfo?.filename ? imageInfo.filename.replace(/\.[^.]+$/, '') : 'sprite'
    downloadCanvas(outCanvas, `${baseName}_aligned.png`)
  }, [frames, referenceFrameId, gridConfig, processedBgCanvas, imageInfo])

  // --- Save / Load ---
  const handleSaveProject = useCallback(() => {
    if (!imageInfo || !imgRef.current) return
    saveProject(imageInfo, imgRef.current, frames, gridConfig, referenceFrameId, bgChromaKey)
  }, [imageInfo, frames, gridConfig, referenceFrameId, bgChromaKey])

  const handleProjectFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const project = await loadProject(file)
      imgRef.current = project.baseImage
      setBaseImage(project.baseImage)
      setImage(project.imageUrl)
      setImageInfo(project.imageInfo)
      setGridConfig(project.gridConfig)
      setFrames(project.frames)
      setReferenceFrameId(project.referenceFrameId)
      setBgChromaKey(project.bgChromaKey)
      setProcessedBgCanvas(project.processedBgCanvas)
      setSelectedFrameId(null)
      setViewMode('sheet')
      setActiveTool('select')

      // Update nextFrameId to avoid collisions
      const maxId = project.frames.reduce((max, f) => {
        const num = parseInt(f.id.slice(1), 10)
        return num > max ? num : max
      }, 0)
      nextFrameIdRef.current = maxId + 1
    } catch (err) {
      alert('Failed to load project: ' + err.message)
    }
  }, [])

  const hasAnchors = frames.some(f => f.anchorX !== null && f.anchorY !== null)
  const gridWarning = gridConfig && imageInfo && (
    imageInfo.width % gridConfig.cols !== 0 || imageInfo.height % gridConfig.rows !== 0
  )

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
        hasAnchors={hasAnchors}
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
          imgRef={imgRef}
          imageInfo={imageInfo}
          gridConfig={gridConfig}
          frames={frames}
          selectedFrameId={selectedFrameId}
          referenceFrameId={referenceFrameId}
          activeTool={activeTool}
          viewMode={viewMode}
          processedBgCanvas={processedBgCanvas}
          alignmentData={alignmentData}
          onSelectFrame={selectFrame}
          onSetAnchor={setFrameAnchor}
          onRemoveAnchor={removeFrameAnchor}
          onColorSampled={handleColorSampled}
          setViewMode={setViewMode}
        />
        <Sidebar
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
          frames={frames}
          selectedFrameId={selectedFrameId}
          referenceFrameId={referenceFrameId}
          onSelectFrame={selectFrame}
          onUpdateLabel={updateFrameLabel}
          selectedFrame={selectedFrame}
          onSetAsReference={setAsReference}
          onClearReference={clearReference}
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
          referenceFrameId={referenceFrameId}
          sheetSource={sheetSource}
          processedBgCanvas={processedBgCanvas}
          onClose={() => setShowAlignmentPreview(false)}
        />
      )}
      {swapCropState && (
        <SwapCropOverlay
          image={swapCropState.image}
          onApplyCrop={handleSwapCropApply}
          onUseFullImage={handleSwapCropFullImage}
          onCancel={() => setSwapCropState(null)}
        />
      )}
    </div>
  )
}

export default App
