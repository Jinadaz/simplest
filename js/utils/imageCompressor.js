/* Simplest - Image Compressor Utility */

/**
 * Resizes and compresses an image File or DataURL to Base64 (max 500x500, quality 0.7)
 * @param {File|Blob} file 
 * @param {number} maxWidth 
 * @param {number} maxHeight 
 * @param {number} quality 
 * @returns {Promise<string>} Base64 data URL
 */
function compressImage(file, maxWidth = 500, maxHeight = 500, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No image file provided'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scaling
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG base64 with quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        console.log(`[ImageCompressor] Compressed from original to ${Math.round(compressedBase64.length / 1024)} KB`);
        resolve(compressedBase64);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}
