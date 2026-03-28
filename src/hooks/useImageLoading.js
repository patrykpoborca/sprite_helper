import { useRef, useCallback } from 'react'

export function useImageLoading({
  setImage, setImageInfo, setBaseImage, imgRef,
  setGridConfig, setFrames, setSelectedFrameId, setSnapPoint,
  setViewMode, setActiveTool, setBgChromaKey, setProcessedBgCanvas,
  nextFrameIdRef,
}) {
  const fileInputRef = useRef(null)

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
      setSnapPoint(null)
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
  }, [imgRef, setBaseImage, setImage, setImageInfo, setGridConfig, setFrames, setSelectedFrameId, setSnapPoint, setViewMode, setActiveTool, setBgChromaKey, setProcessedBgCanvas, nextFrameIdRef])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleImageLoad(file)
    e.target.value = ''
  }, [handleImageLoad])

  const handleDrop = useCallback((e, projectDropRef) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    if (file.name.endsWith('.spritemagic')) {
      projectDropRef.current?.(file)
    } else if (file.type.startsWith('image/')) {
      handleImageLoad(file)
    }
  }, [handleImageLoad])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  return {
    fileInputRef,
    handleImageLoad,
    handleFileSelect,
    handleDrop,
    handleDragOver,
  }
}
