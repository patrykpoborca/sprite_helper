import { useRef, useCallback } from 'react'
import { buildProcessedCanvas } from '../utils/canvasUtils.js'

export function useFrameSwap({ setFrames, swapCropState, setSwapCropState }) {
  const swapInputRef = useRef(null)
  const swapTargetFrameRef = useRef(null)

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
  }, [setSwapCropState])

  const handleSwapCropApply = useCallback((crop) => {
    if (!swapCropState) return
    setFrames(prev => prev.map(f => {
      if (f.id !== swapCropState.frameId) return f
      const updated = { ...f, swapImage: swapCropState.image, swapCrop: crop }
      if (f.chromaKey) {
        updated.processedCanvas = buildProcessedCanvas(swapCropState.image, crop, f.chromaKey)
      }
      return updated
    }))
    setSwapCropState(null)
  }, [swapCropState, setFrames, setSwapCropState])

  const removeSwap = useCallback((frameId) => {
    setFrames(prev => prev.map(f =>
      f.id === frameId ? { ...f, swapImage: null, swapCrop: null, chromaKey: null, processedCanvas: null } : f
    ))
  }, [setFrames])

  return {
    swapInputRef,
    handleSwapUpload,
    handleSwapFileSelect,
    handleSwapCropApply,
    removeSwap,
  }
}
