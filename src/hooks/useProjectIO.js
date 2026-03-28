import { useRef, useCallback } from 'react'
import { saveProject, loadProject } from '../utils/projectFile.js'
import { exportAlignedSheet, downloadCanvas } from '../utils/spriteExport.js'
import { getFrameCanvas } from '../utils/frameExtract.js'

export function useProjectIO({
  imageInfo, imgRef, frames, gridConfig, snapPoint, bgChromaKey,
  processedBgCanvas,
  setImage, setImageInfo, setBaseImage,
  setGridConfig, setFrames, setSelectedFrameId, setSnapPoint,
  setBgChromaKey, setProcessedBgCanvas,
  setViewMode, setActiveTool,
  nextFrameIdRef,
}) {
  const projectInputRef = useRef(null)
  const projectDropRef = useRef(null)

  const handleExport = useCallback(() => {
    if (!frames.length || !gridConfig || !imgRef.current) return
    const source = processedBgCanvas || imgRef.current
    const outCanvas = exportAlignedSheet(frames, snapPoint, gridConfig, source)
    const baseName = imageInfo?.filename ? imageInfo.filename.replace(/\.[^.]+$/, '') : 'sprite'
    downloadCanvas(outCanvas, `${baseName}_aligned.png`)
  }, [frames, snapPoint, gridConfig, processedBgCanvas, imageInfo, imgRef])

  const handleSaveProject = useCallback(() => {
    if (!imageInfo || !imgRef.current) return
    saveProject(imageInfo, imgRef.current, frames, gridConfig, snapPoint, bgChromaKey)
  }, [imageInfo, imgRef, frames, gridConfig, snapPoint, bgChromaKey])

  const loadProjectFile = useCallback(async (file) => {
    try {
      const project = await loadProject(file)
      imgRef.current = project.baseImage
      setBaseImage(project.baseImage)
      setImage(project.imageUrl)
      setImageInfo(project.imageInfo)
      setGridConfig(project.gridConfig)
      setFrames(project.frames)
      setSnapPoint(project.snapPoint)
      setBgChromaKey(project.bgChromaKey)
      setProcessedBgCanvas(project.processedBgCanvas)
      setSelectedFrameId(null)
      setViewMode('sheet')
      setActiveTool('select')

      const maxId = project.frames.reduce((max, f) => {
        const num = parseInt(f.id.slice(1), 10)
        return num > max ? num : max
      }, 0)
      nextFrameIdRef.current = maxId + 1
    } catch (err) {
      alert('Failed to load project: ' + err.message)
    }
  }, [imgRef, setBaseImage, setImage, setImageInfo, setGridConfig, setFrames, setSelectedFrameId, setSnapPoint, setBgChromaKey, setProcessedBgCanvas, setViewMode, setActiveTool, nextFrameIdRef])

  // Keep ref updated for drag-drop handler
  projectDropRef.current = loadProjectFile

  const handleProjectFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    loadProjectFile(file)
  }, [loadProjectFile])

  const downloadFrame = useCallback((frameId) => {
    const frame = frames.find(f => f.id === frameId)
    if (!frame || !imgRef.current) return
    const source = processedBgCanvas || imgRef.current
    const canvas = getFrameCanvas(frame, source)
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `${frame.label.replace(/\s+/g, '_')}.png`
    link.click()
  }, [frames, processedBgCanvas, imgRef])

  return {
    projectInputRef,
    projectDropRef,
    handleExport,
    handleSaveProject,
    loadProjectFile,
    handleProjectFileSelect,
    downloadFrame,
  }
}
