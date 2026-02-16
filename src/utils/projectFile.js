import { applyChromaKey } from './chromaKey.js'

function imageToDataURL(img) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL('image/png')
}

function dataURLToImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image from data URL'))
    img.src = dataURL
  })
}

function buildProcessedCanvas(swapImage, swapCrop, chromaKey) {
  if (!swapImage || !chromaKey) return null

  let sw, sh
  if (swapCrop) {
    sw = swapCrop.w
    sh = swapCrop.h
  } else {
    sw = swapImage.naturalWidth || swapImage.width
    sh = swapImage.naturalHeight || swapImage.height
  }

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = sw
  tempCanvas.height = sh
  const ctx = tempCanvas.getContext('2d')

  if (swapCrop) {
    ctx.drawImage(swapImage, swapCrop.x, swapCrop.y, swapCrop.w, swapCrop.h, 0, 0, sw, sh)
  } else {
    ctx.drawImage(swapImage, 0, 0)
  }

  return applyChromaKey(tempCanvas, chromaKey.color, chromaKey.tolerance)
}

function buildProcessedBgCanvas(baseImage, bgChromaKey) {
  if (!baseImage || !bgChromaKey) return null

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = baseImage.naturalWidth || baseImage.width
  tempCanvas.height = baseImage.naturalHeight || baseImage.height
  const ctx = tempCanvas.getContext('2d')
  ctx.drawImage(baseImage, 0, 0)

  return applyChromaKey(tempCanvas, bgChromaKey.color, bgChromaKey.tolerance)
}

/**
 * Save a complete Sprite Magic project to a downloadable .spritemagic file.
 */
export function saveProject(imageInfo, baseImage, frames, gridConfig, referenceFrameId, bgChromaKey) {
  const baseImageDataURL = imageToDataURL(baseImage)

  const serializedFrames = frames.map((f) => {
    const serialized = {
      id: f.id,
      row: f.row,
      col: f.col,
      label: f.label,
      srcX: f.srcX,
      srcY: f.srcY,
      srcW: f.srcW,
      srcH: f.srcH,
      anchorX: f.anchorX,
      anchorY: f.anchorY,
      isReference: f.isReference,
      swapCrop: f.swapCrop || null,
      chromaKey: f.chromaKey || null,
      swapImageDataURL: null,
    }

    if (f.swapImage) {
      serialized.swapImageDataURL = imageToDataURL(f.swapImage)
    }

    return serialized
  })

  const projectData = {
    version: 1,
    imageInfo,
    baseImageDataURL,
    frames: serializedFrames,
    gridConfig,
    referenceFrameId,
    bgChromaKey: bgChromaKey || null,
  }

  const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const baseName = imageInfo.filename ? imageInfo.filename.replace(/\.[^.]+$/, '') : 'project'
  link.download = `${baseName}_project.spritemagic`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Load a project from a .spritemagic file.
 */
export function loadProject(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read project file'))
    reader.onload = async () => {
      try {
        const projectData = JSON.parse(reader.result)
        if (!projectData.version || projectData.version !== 1) {
          reject(new Error('Unsupported project version: ' + (projectData.version || 'unknown')))
          return
        }
        const { imageInfo, baseImageDataURL, frames: serializedFrames, gridConfig, referenceFrameId, bgChromaKey } = projectData

        const baseImage = await dataURLToImage(baseImageDataURL)
        const imageUrl = baseImageDataURL

        const frames = await Promise.all(
          serializedFrames.map(async (sf) => {
            const frame = {
              id: sf.id,
              row: sf.row,
              col: sf.col,
              label: sf.label,
              srcX: sf.srcX,
              srcY: sf.srcY,
              srcW: sf.srcW,
              srcH: sf.srcH,
              anchorX: sf.anchorX,
              anchorY: sf.anchorY,
              isReference: sf.isReference,
              swapCrop: sf.swapCrop || null,
              chromaKey: sf.chromaKey || null,
              swapImage: null,
              processedCanvas: null,
            }

            if (sf.swapImageDataURL) {
              frame.swapImage = await dataURLToImage(sf.swapImageDataURL)
            }

            if (frame.swapImage && frame.chromaKey) {
              frame.processedCanvas = buildProcessedCanvas(frame.swapImage, frame.swapCrop, frame.chromaKey)
            }

            return frame
          })
        )

        const processedBgCanvas = buildProcessedBgCanvas(baseImage, bgChromaKey)

        resolve({
          imageInfo,
          imageUrl,
          baseImage,
          frames,
          gridConfig,
          referenceFrameId,
          bgChromaKey,
          processedBgCanvas,
        })
      } catch (err) {
        reject(new Error('Invalid project file: ' + err.message))
      }
    }
    reader.readAsText(file)
  })
}
