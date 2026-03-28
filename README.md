# Sprite Magic

A browser-based sprite sheet editor for aligning, editing, and exporting sprite animation frames. No server, no sign-up — runs entirely in your browser.

## What It Does

Sprite sheets often have frames that aren't aligned consistently. A character's feet might shift between frames, or a weapon swing might drift across cells. Sprite Magic lets you define reference points on each frame and a snap point on the grid, then automatically computes pixel offsets to align every frame. The result is a clean, aligned sprite sheet ready for use in a game engine.

## Features

### Grid Slicing
Load any sprite sheet image and define a grid (rows x columns). Sprite Magic slices the image into individual frames based on your grid. If the image dimensions don't divide evenly, you'll see a warning.

### Reference Points
Click on each frame to place a **reference point** — the pixel that should stay consistent across frames (e.g. a character's foot, a weapon's hilt). After placing a ref point, the editor auto-advances to the next frame that doesn't have one yet.

### Snap Point
The **snap point** is where all reference points align to on the output grid. It defaults to the cell center when you apply a grid. You can also set **per-frame snap point overrides** for frames that need different alignment targets.

### Alignment Preview
Preview your aligned animation in real time with play/pause, adjustable FPS, and onion skinning. This shows exactly how the exported sheet will look in motion.

### Frame Swap
Replace any individual frame with a different image. When you upload a replacement, a crop overlay lets you select the region to use. The cropped area is scaled to fit the grid cell.

### Chroma Key (Background Removal)
Remove solid-color backgrounds from the entire sheet or from individual swapped frames. Use the eyedropper tool to pick the color to remove, then adjust tolerance for clean edges. The chroma key uses soft falloff to avoid harsh cutouts.

### Export
Export the aligned sprite sheet as a PNG. The exporter computes padding so no frame content is clipped after alignment shifts, then composites every frame at its corrected position.

### Individual Frame Download
Download any single frame as a standalone PNG.

### Project Save/Load
Save your entire workspace — image, grid, frames, reference points, snap points, swaps, and chroma key settings — to a `.spritemagic` file. Load it back later to pick up where you left off. Drag-and-drop loading is supported. The format is versioned (currently v3) with backwards compatibility for older project files.

## View Modes

- **Sheet View** — See the full sprite sheet with grid overlay. Click frames to select them, place reference points and snap points.
- **Frame View** — Zoom into a single frame. Navigate between frames with arrow keys.
- **Aligned View** — See the sheet with alignment offsets applied, showing the final result.

## Tools

- **Select** — Click frames to select them on the canvas.
- **Ref Point** — Click within a frame to set its reference point.
- **Snap Point** — Click to set where reference points should align to.
- **Eyedropper** — Sample a color from the canvas for chroma key.

## Keyboard Shortcuts

- `Left/Right Arrow` — Navigate frames in Frame View
- `Escape` — Cancel eyedropper or swap crop

## Tech Stack

React 19, Vite 7, pure canvas rendering. No external dependencies beyond React. All image processing (chroma key, alignment, export) runs client-side on HTML5 Canvas.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, load a sprite sheet image, and start aligning.
