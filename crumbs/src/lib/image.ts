const MAX_SOURCE_BYTES = 30 * 1024 * 1024

// Types that go up untouched.
//
// A GIF through the canvas would arrive as a JPEG of its first frame:
// createImageBitmap decodes one frame, and toBlob writes JPEG. Nothing would
// error — the upload would simply succeed and the animation would be gone, which
// is worse than refusing, because the person gets no idea why their GIF came back
// as a photograph. So these skip the pipeline and are sent as they are; the
// server already accepts image/gif.
//
// The square crop is not lost either: every avatar is drawn in a square box with
// object-cover, so the browser crops at display time and a GIF does not have to
// arrive pre-cropped.
const PASSTHROUGH = 'image/gif'

function checkSource(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('That image is too large. Choose one under 30 MB.')
  }
}

async function readBitmap(file: File): Promise<ImageBitmap> {
  checkSource(file)
  try {
    return await createImageBitmap(file)
  } catch {
    throw new Error("We couldn't read that image. Try a JPEG, PNG, WebP or GIF.")
  }
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not process that image.')),
      'image/jpeg',
      0.88,
    )
  })
}

function paint(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  source: { x: number; y: number; width: number; height: number },
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Your browser cannot process images.')
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(
    bitmap,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    width,
    height,
  )
  bitmap.close()
  return canvas
}

// Centered square crop, used for profile photos.
export async function resizeToSquare(file: File, size = 256): Promise<Blob> {
  checkSource(file)
  if (file.type === PASSTHROUGH) return file

  const bitmap = await readBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  return toJpeg(
    paint(bitmap, size, size, {
      x: (bitmap.width - side) / 2,
      y: (bitmap.height - side) / 2,
      width: side,
      height: side,
    }),
  )
}

// Whole picture, just scaled down so uploads stay small.
export async function resizeToFit(file: File, maxSide = 1600): Promise<Blob> {
  checkSource(file)
  if (file.type === PASSTHROUGH) return file

  const bitmap = await readBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  return toJpeg(
    paint(bitmap, width, height, { x: 0, y: 0, width: bitmap.width, height: bitmap.height }),
  )
}