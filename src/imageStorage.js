// IndexedDB utilities for client-side image storage
// This provides much larger storage capacity than localStorage (50MB-1GB+ vs 5-10MB)

const DB_NAME = 'ValueatorImageDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Save image to IndexedDB
export const saveImageToDB = async (imageData) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const imageRecord = {
      id: imageData.id || Date.now().toString(),
      name: imageData.name,
      size: imageData.size,
      type: imageData.type,
      lastModified: imageData.lastModified,
      timestamp: Date.now(),
      dataUrl: imageData.dataUrl,
      thumbnailUrl: imageData.thumbnailUrl || null
    };
    
    const request = store.put(imageRecord);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(imageRecord.id);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save image to IndexedDB:', error);
    throw error;
  }
};

// Load all images from IndexedDB
export const loadImagesFromDB = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    
    // Get all images ordered by timestamp (newest first)
    const request = index.openCursor(null, 'prev');
    
    return new Promise((resolve, reject) => {
      const images = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          images.push(cursor.value);
          cursor.continue();
        } else {
          resolve(images);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load images from IndexedDB:', error);
    return [];
  }
};

// Delete specific images from IndexedDB
export const deleteImagesFromDB = async (imageIds) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const deletePromises = imageIds.map(id => {
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Failed to delete images from IndexedDB:', error);
    return false;
  }
};

// Get storage usage information
export const getStorageInfo = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        available: estimate.quota,
        percentage: estimate.quota ? (estimate.usage / estimate.quota * 100) : 0
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return null;
  }
};

// Clear all images (useful for testing or user cleanup)
export const clearAllImages = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear images:', error);
    throw error;
  }
};

// Fallback functions for localStorage (if IndexedDB fails)
export const saveImageToLocalStorage = (imageData) => {
  try {
    const existing = JSON.parse(localStorage.getItem('recentImages') || '[]');
    const updated = existing.filter(img => img.name !== imageData.name);
    updated.unshift(imageData);
    
    // Keep only 10 most recent and handle quota
    const limited = updated.slice(0, 10);
    localStorage.setItem('recentImages', JSON.stringify(limited));
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Try with fewer images
      try {
        const existing = JSON.parse(localStorage.getItem('recentImages') || '[]');
        const updated = existing.filter(img => img.name !== imageData.name);
        updated.unshift(imageData);
        const limited = updated.slice(0, 3);
        localStorage.setItem('recentImages', JSON.stringify(limited));
        return true;
      } catch (secondError) {
        console.error('Even limited localStorage save failed:', secondError);
        return false;
      }
    }
    console.error('localStorage save failed:', error);
    return false;
  }
};

export const loadImagesFromLocalStorage = () => {
  try {
    const imagesJson = localStorage.getItem('recentImages');
    return imagesJson ? JSON.parse(imagesJson) : [];
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return [];
  }
};