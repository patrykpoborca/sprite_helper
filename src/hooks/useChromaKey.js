import { useCallback } from 'react'
import { applyChromaKey } from '../utils/chromaKey.js'
import { buildProcessedCanvas } from '../utils/canvasUtils.js'

export function useChromaKey({
  imgRef, selectedFrame, setFrames, setActiveTool,
  bgChromaKey, setBgChromaKey, processedBgCanvas, setProcessedBgCanvas,
  eyedropperTarget, setEyedropperTarget,
}) {
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
  }, [imgRef, setBgChromaKey, setProcessedBgCanvas])

  const startEyedropper = useCallback((target) => {
    setEyedropperTarget(target)
    setActiveTool('eyedropper')
  }, [setEyedropperTarget, setActiveTool])

  const handleColorSampled = useCallback((hexColor) => {
    if (eyedropperTarget === 'background') {
      const settings = bgChromaKey || { color: hexColor, tolerance: 20 }
      updateBgChromaKey({ ...settings, color: hexColor })
    } else if (eyedropperTarget === 'frame' && selectedFrame) {
      const settings = selectedFrame.chromaKey || { color: hexColor, tolerance: 20 }
      setFrames(prev => prev.map(f => {
        if (f.id !== selectedFrame.id) return f
        const newChromaKey = { ...settings, color: hexColor }
        const processedCanvas = buildProcessedCanvas(f.swapImage, f.swapCrop, newChromaKey)
        return { ...f, chromaKey: newChromaKey, processedCanvas }
      }))
    }
    setEyedropperTarget(null)
    setActiveTool('select')
  }, [eyedropperTarget, bgChromaKey, selectedFrame, updateBgChromaKey, setFrames, setEyedropperTarget, setActiveTool])

  const updateFrameChromaKey = useCallback((frameId, settings) => {
    setFrames(prev => prev.map(f => {
      if (f.id !== frameId) return f
      if (!settings) {
        return { ...f, chromaKey: null, processedCanvas: null }
      }
      const processedCanvas = buildProcessedCanvas(f.swapImage, f.swapCrop, settings)
      return { ...f, chromaKey: settings, processedCanvas }
    }))
  }, [setFrames])

  return {
    updateBgChromaKey,
    startEyedropper,
    handleColorSampled,
    updateFrameChromaKey,
  }
}
