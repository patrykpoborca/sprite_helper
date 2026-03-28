import { applyChromaKey } from './chromaKey.js'
import { buildProcessedCanvas } from './canvasUtils.js'

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
export function saveProject(imageInfo, baseImage, frames, gridConfig, snapPoint, bgChromaKey) {
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
      refPointX: f.refPointX,
      refPointY: f.refPointY,
      snapPointX: f.snapPointX != null ? f.snapPointX : null,
      snapPointY: f.snapPointY != null ? f.snapPointY : null,
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
    version: 3,
    imageInfo,
    baseImageDataURL,
    frames: serializedFrames,
    gridConfig,
    snapPoint: snapPoint || null,
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
        const version = projectData.version || 0

        if (version === 1) {
          return resolve(loadV1(projectData))
        }
        if (version === 2) {
          return resolve(loadV2(projectData))
        }
        if (version === 3) {
          return resolve(loadV3(projectData))
        }

        reject(new Error('Unsupported project version: ' + version))
      } catch (err) {
        reject(new Error('Invalid project file: ' + err.message))
      }
    }
    reader.readAsText(file)
  })
}

/**
 * Load version 1 format (legacy: anchorX/anchorY/isReference/referenceFrameId).
 * Migrates to version 2 data model on load.
 */
async function loadV1(projectData) {
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
        refPointX: sf.anchorX !== undefined ? sf.anchorX : null,
        refPointY: sf.anchorY !== undefined ? sf.anchorY : null,
        snapPointX: null,
        snapPointY: null,
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

  // In V1, anchorX/anchorY was cell-local for all frames.
  // The reference frame's anchor becomes the snap point.
  // All other frames' anchors become their ref points.
  // The resulting math (snapPoint - refPoint) is equivalent to V1 alignment.
  // Migrate referenceFrameId: if a reference frame had an anchor, use that as snap point
  let snapPoint = null
  if (referenceFrameId) {
    const refFrame = frames.find(f => f.id === referenceFrameId)
    if (refFrame && refFrame.refPointX !== null && refFrame.refPointY !== null) {
      snapPoint = { x: refFrame.refPointX, y: refFrame.refPointY }
    }
  }

  const processedBgCanvas = buildProcessedBgCanvas(baseImage, bgChromaKey)

  return {
    imageInfo,
    imageUrl,
    baseImage,
    frames,
    gridConfig,
    snapPoint,
    bgChromaKey,
    processedBgCanvas,
  }
}

/**
 * Load version 2 format (refPointX/refPointY + snapPoint).
 */
async function loadV2(projectData) {
  const { imageInfo, baseImageDataURL, frames: serializedFrames, gridConfig, snapPoint, bgChromaKey } = projectData

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
        refPointX: sf.refPointX !== undefined ? sf.refPointX : null,
        refPointY: sf.refPointY !== undefined ? sf.refPointY : null,
        snapPointX: null,
        snapPointY: null,
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

  return {
    imageInfo,
    imageUrl,
    baseImage,
    frames,
    gridConfig,
    snapPoint: snapPoint || null,
    bgChromaKey,
    processedBgCanvas,
  }
}

/**
 * Load version 3 format (refPointX/refPointY + snapPoint + per-frame snapPointX/snapPointY).
 */
async function loadV3(projectData) {
  const { imageInfo, baseImageDataURL, frames: serializedFrames, gridConfig, snapPoint, bgChromaKey } = projectData

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
        refPointX: sf.refPointX !== undefined ? sf.refPointX : null,
        refPointY: sf.refPointY !== undefined ? sf.refPointY : null,
        snapPointX: sf.snapPointX != null ? sf.snapPointX : null,
        snapPointY: sf.snapPointY != null ? sf.snapPointY : null,
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

  return {
    imageInfo,
    imageUrl,
    baseImage,
    frames,
    gridConfig,
    snapPoint: snapPoint || null,
    bgChromaKey,
    processedBgCanvas,
  }
}
