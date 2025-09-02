// Image compression and utility functions for better storage efficiency

// Compress image by reducing quality and/or dimensions
export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, format, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Create thumbnail for grid display
export const createThumbnail = (file, size = 150) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const { width, height } = img;
      const aspectRatio = width / height;
      
      // Set canvas size to square thumbnail
      canvas.width = size;
      canvas.height = size;
      
      // Calculate dimensions to fit image in square (with cropping)
      let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
      
      if (aspectRatio > 1) {
        // Wide image - fit height, crop width
        drawHeight = size;
        drawWidth = size * aspectRatio;
        offsetX = (size - drawWidth) / 2;
      } else {
        // Tall image - fit width, crop height
        drawWidth = size;
        drawHeight = size / aspectRatio;
        offsetY = (size - drawHeight) / 2;
      }
      
      // Fill background with white
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, size, size);
      
      // Draw image
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      canvas.toBlob(resolve, 'image/jpeg', 0.7);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Convert blob to data URL
export const blobToDataUrl = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

// Get file size in human readable format
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if image needs compression based on size
export const shouldCompressImage = (file, maxSize = 2 * 1024 * 1024) => { // 2MB default
  return file.size > maxSize;
};

// Process uploaded file (compress if needed, create thumbnail)
export const processImageFile = async (file) => {
  const shouldCompress = shouldCompressImage(file);
  
  let processedFile = file;
  let compressionApplied = false;
  
  // Compress main image if it's too large
  if (shouldCompress) {
    processedFile = await compressImage(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8
    });
    compressionApplied = true;
  }
  
  // Create thumbnail
  const thumbnailBlob = await createThumbnail(file, 150);
  
  // Convert to data URLs
  const [dataUrl, thumbnailUrl] = await Promise.all([
    blobToDataUrl(processedFile),
    blobToDataUrl(thumbnailBlob)
  ]);
  
  return {
    id: Date.now().toString(),
    name: file.name,
    size: processedFile.size,
    originalSize: file.size,
    type: file.type,
    lastModified: file.lastModified,
    dataUrl,
    thumbnailUrl,
    compressed: compressionApplied
  };
};

// Estimate storage space used by images
export const calculateImageStorageSize = (images) => {
  return images.reduce((total, image) => {
    // Approximate data URL size (base64 encoding adds ~33% overhead)
    const dataUrlSize = image.dataUrl ? image.dataUrl.length * 0.75 : 0;
    const thumbnailSize = image.thumbnailUrl ? image.thumbnailUrl.length * 0.75 : 0;
    return total + dataUrlSize + thumbnailSize;
  }, 0);
};