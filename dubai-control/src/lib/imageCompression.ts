// dubai-control/src/lib/imageCompression.ts
/**
 * Image compression utilities for offline photo storage
 * V3 PWA Enhancement - Phase 1.5: Photo Compression
 *
 * Reduces photo file size before saving to IndexedDB
 * Target: Keep photos under 10MB (server limit)
 */

/**
 * Compression options
 */
export interface CompressionOptions {
  maxSizeMB: number;        // Max file size in MB (default: 8)
  maxWidthOrHeight: number; // Max dimension in pixels (default: 1920)
  quality: number;          // JPEG quality 0-1 (default: 0.85)
  useWebWorker?: boolean;   // Use web worker for compression (default: false)
}

/**
 * Default compression options
 * Target: 8MB (buffer below 10MB server limit)
 */
export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 8,
  maxWidthOrHeight: 1920,
  quality: 0.85,
  useWebWorker: false,
};

/**
 * Compress an image file using Canvas API
 *
 * @param file - Original image file
 * @param options - Compression options
 * @returns Compressed image as File
 */
export async function compressImage(
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<File> {
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };

  // If file is already small enough, return as-is
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB <= opts.maxSizeMB) {
    console.log(`Image already under ${opts.maxSizeMB}MB, skipping compression`);
    return file;
  }

  console.log(`Compressing image from ${fileSizeMB.toFixed(2)}MB...`);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          const maxDim = opts.maxWidthOrHeight;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = (height / width) * maxDim;
              width = maxDim;
            } else {
              width = (width / height) * maxDim;
              height = maxDim;
            }
          }

          // Create canvas for compression
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with quality compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              const compressedSizeMB = blob.size / (1024 * 1024);
              console.log(
                `Compression complete: ${fileSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`
              );

              // Create new File from compressed blob
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            "image/jpeg",
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Get file size in MB
 */
export function getFileSizeMB(file: File): number {
  return file.size / (1024 * 1024);
}

/**
 * Validate image file size
 *
 * @param file - Image file to validate
 * @param maxSizeMB - Maximum allowed size in MB
 * @returns true if valid, false otherwise
 */
export function validateImageSize(file: File, maxSizeMB: number = 10): boolean {
  const sizeMB = getFileSizeMB(file);
  return sizeMB <= maxSizeMB;
}
