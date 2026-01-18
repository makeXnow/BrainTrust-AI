/**
 * Crops frames/borders from images using edge detection.
 * Returns the cropped image as a data URL.
 */
export function cropImageFrame(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    if (!imageSrc) {
      resolve(imageSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        resolve(imageSrc);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;

      const TOLERANCE = 15;
      const EDGE_STRENGTH = 10;

      const getColorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
        return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
      };

      const getPixel = (x: number, y: number): [number, number, number] => {
        const idx = (y * width + x) * 4;
        return [data[idx], data[idx + 1], data[idx + 2]];
      };

      // Get background color from near top-left corner
      const bg = getPixel(2, 2);
      const colorThreshold = (TOLERANCE / 100) * 441;
      const gradThreshold = (EDGE_STRENGTH / 100) * 441;

      const isContent = (x: number, y: number, px: number, py: number): boolean => {
        const curr = getPixel(x, y);
        const distFromBg = getColorDistance(curr[0], curr[1], curr[2], bg[0], bg[1], bg[2]);
        if (distFromBg < colorThreshold) return false;
        const prev = getPixel(px, py);
        const localGradient = getColorDistance(curr[0], curr[1], curr[2], prev[0], prev[1], prev[2]);
        return localGradient > gradThreshold || distFromBg > (colorThreshold * 2.5);
      };

      let top = 0, bottom = height - 1, left = 0, right = width - 1;

      // Find top edge
      outerTop: for (let y = 5; y < height - 5; y++) {
        for (let x = 0; x < width; x++) {
          if (isContent(x, y, x, y - 1)) { top = y; break outerTop; }
        }
      }
      // Find bottom edge
      outerBottom: for (let y = height - 6; y >= top; y--) {
        for (let x = 0; x < width; x++) {
          if (isContent(x, y, x, y + 1)) { bottom = y; break outerBottom; }
        }
      }
      // Find left edge
      outerLeft: for (let x = 5; x < width - 5; x++) {
        for (let y = top; y <= bottom; y++) {
          if (isContent(x, y, x - 1, y)) { left = x; break outerLeft; }
        }
      }
      // Find right edge
      outerRight: for (let x = width - 6; x >= left; x--) {
        for (let y = top; y <= bottom; y++) {
          if (isContent(x, y, x + 1, y)) { right = x; break outerRight; }
        }
      }

      const cropWidth = (right - left) + 1;
      const cropHeight = (bottom - top) + 1;

      if (cropWidth <= 0 || cropHeight <= 0) {
        resolve(imageSrc);
        return;
      }

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx!.drawImage(img, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      resolve(cropCanvas.toDataURL('image/png'));
    };
    
    img.onerror = () => {
      resolve(imageSrc);
    };
    
    img.src = imageSrc;
  });
}
