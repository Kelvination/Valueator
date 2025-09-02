// App.js
import { Node, Shaders } from 'gl-react';
import { Surface } from 'gl-react-dom';
import { useEffect, useRef, useState } from 'react';
import { FaCheckCircle, FaCog, FaImages, FaMinusCircle, FaPlusCircle, FaSave, FaTrash } from 'react-icons/fa';
import { saveAs } from 'file-saver';
import { IoMdColorPalette } from 'react-icons/io';
import './App.css';
import HSVColorPickerModal from './HSVColorPickerModal';
import { saveImageToDB, loadImagesFromDB, deleteImagesFromDB, saveImageToLocalStorage, loadImagesFromLocalStorage } from './imageStorage';
import { processImageFile, formatFileSize } from './imageUtils';

const shaders = Shaders.create({
  imageShader: {
    frag: `
      precision highp float;
      varying vec2 uv;
      uniform sampler2D image;
      uniform float thresholds[10]; // Max 11 levels => 10 thresholds
      uniform float isGrayscale;
      uniform vec3 levelColors[11];

      void main () {
        vec4 color = texture2D(image, uv);

        if (isGrayscale > 0.5) {
          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          int level = 0;

          if (gray < thresholds[0]) {
            level = 0;
          } else if (gray < thresholds[1]) {
            level = 1;
          } else if (gray < thresholds[2]) {
            level = 2;
          } else if (gray < thresholds[3]) {
            level = 3;
          } else if (gray < thresholds[4]) {
            level = 4;
          } else if (gray < thresholds[5]) {
            level = 5;
          } else if (gray < thresholds[6]) {
            level = 6;
          } else if (gray < thresholds[7]) {
            level = 7;
          } else if (gray < thresholds[8]) {
            level = 8;
          } else if (gray < thresholds[9]) {
            level = 9;
          } else {
            level = 10;
          }

          // Use a series of if-else statements to select the color
          vec3 selectedColor;
          if (level == 0) {
            selectedColor = levelColors[0];
          } else if (level == 1) {
            selectedColor = levelColors[1];
          } else if (level == 2) {
            selectedColor = levelColors[2];
          } else if (level == 3) {
            selectedColor = levelColors[3];
          } else if (level == 4) {
            selectedColor = levelColors[4];
          } else if (level == 5) {
            selectedColor = levelColors[5];
          } else if (level == 6) {
            selectedColor = levelColors[6];
          } else if (level == 7) {
            selectedColor = levelColors[7];
          } else if (level == 8) {
            selectedColor = levelColors[8];
          } else if (level == 9) {
            selectedColor = levelColors[9];
          } else {
            selectedColor = levelColors[10];
          }

          gl_FragColor = vec4(selectedColor, color.a);
        } else {
          gl_FragColor = color;
        }
      }
    `,
  },
});

function App() {
  const [imageUri, setImageUri] = useState(null);
  const [imageWidth, setImageWidth] = useState(null);
  const [imageHeight, setImageHeight] = useState(null);
  const [loadedImage, setLoadedImage] = useState(null);
  const [levels, setLevels] = useState(3);
  const [levelRanges, setLevelRanges] = useState(Array(3).fill(1 / 3));
  const [recentImages, setRecentImages] = useState([]);
  const [showRecentImages, setShowRecentImages] = useState(false);
  const [isGrayscale, setIsGrayscale] = useState(true);
  const [showSliders, setShowSliders] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingImage, setLoadingImage] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [currentColorLevel, setCurrentColorLevel] = useState(null);
  const [levelColors, setLevelColors] = useState([
    { h: 0, s: 0, v: 0 },   // Black
    { h: 0, s: 0, v: 0.5 }, // Gray
    { h: 0, s: 0, v: 1.0 }, // White
    // Fill the rest with white
    ...Array(8).fill({ h: 0, s: 0, v: 1.0 }),
  ]);
  const [tempColor, setTempColor] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Update window width on resize
    const handleResize = () => setWindowWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup object URLs when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      recentImages.forEach(imageMetadata => {
        if (imageMetadata.objectUrl) {
          URL.revokeObjectURL(imageMetadata.objectUrl);
        }
      });
    };
  }, [recentImages]);

  const surfaceRef = useRef();

  // Helper function to convert HSV to RGB
  const HSVtoRGB = (h, s, v) => {
    let r, g, b;

    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);

    i = i % 6;

    if (i === 0) {
      r = v;
      g = t;
      b = p;
    } else if (i === 1) {
      r = q;
      g = v;
      b = p;
    } else if (i === 2) {
      r = p;
      g = v;
      b = t;
    } else if (i === 3) {
      r = p;
      g = q;
      b = v;
    } else if (i === 4) {
      r = t;
      g = p;
      b = v;
    } else if (i === 5) {
      r = v;
      g = p;
      b = q;
    }

    return { r, g, b };
  };

  // Function to get level colors for the shader
  const getLevelColors = () => {
    const colors = levelColors.slice(0, levels).map(({ h, s, v }) => {
      const rgb = HSVtoRGB(h, s, v);
      return [rgb.r, rgb.g, rgb.b];
    });
    while (colors.length < 11) {
      colors.push([1.0, 1.0, 1.0]);
    }
    return colors;
  };

  // Function to generate default grayscale colors based on levels
  const generateDefaultGrayscaleColors = (levels) => {
    const colors = [];
    if (levels === 1) {
      colors.push({ h: 0, s: 0, v: 0 });
    } else {
      for (let i = 0; i < levels; i++) {
        const v = i / (levels - 1);
        colors.push({ h: 0, s: 0, v });
      }
    }
    while (colors.length < 11) {
      colors.push({ h: 0, s: 0, v: 1.0 });
    }
    return colors;
  };

  // Initialize levelColors based on initial levels
  useEffect(() => {
    setLevelColors(generateDefaultGrayscaleColors(levels));
  }, [levels]);

  // Update levelColors when levels change
  useEffect(() => {
    setLevelColors((prevColors) => {
      const defaultColors = generateDefaultGrayscaleColors(levels);
      return [...defaultColors.slice(0, levels), ...prevColors.slice(levels)];
    });
  }, [levels]);

  // Load recent images from IndexedDB (with localStorage fallback)
  useEffect(() => {
    const loadImages = async () => {
      try {
        // Try IndexedDB first
        const images = await loadImagesFromDB();
        if (images.length > 0) {
          setRecentImages(images);
          console.log('Loaded', images.length, 'recent images from IndexedDB');
          return;
        }
        
        // Fallback to localStorage for migration
        const localImages = loadImagesFromLocalStorage();
        if (localImages.length > 0) {
          setRecentImages(localImages);
          console.log('Loaded', localImages.length, 'images from localStorage (will migrate to IndexedDB)');
          
          // Migrate to IndexedDB in background
          setTimeout(async () => {
            try {
              for (const image of localImages) {
                await saveImageToDB(image);
              }
              console.log('Successfully migrated images to IndexedDB');
              // Clean up localStorage after successful migration
              localStorage.removeItem('recentImages');
            } catch (migrationError) {
              console.warn('Failed to migrate images to IndexedDB:', migrationError);
            }
          }, 1000);
        }
      } catch (error) {
        console.warn('Failed to load images:', error);
        // Final fallback to localStorage
        const localImages = loadImagesFromLocalStorage();
        if (localImages.length > 0) {
          setRecentImages(localImages);
        }
      }
    };
    
    loadImages();
  }, []);


  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert('No image selected');
      return;
    }

    setLoadingImage(true);
    
    try {
      // Process image (compress if needed, create thumbnail)
      const processedImageData = await processImageFile(file);
      
      // Set current image for display
      setImageUri(processedImageData.dataUrl);
      
      // Create Image object to get dimensions
      const img = new Image();
      img.onload = () => {
        setImageWidth(img.width);
        setImageHeight(img.height);
        setLoadedImage(img);
        setLoadingImage(false);
      };
      img.src = processedImageData.dataUrl;

      // Save to IndexedDB (with localStorage fallback)
      try {
        await saveImageToDB(processedImageData);
        console.log('Image saved to IndexedDB');
      } catch (dbError) {
        console.warn('Failed to save to IndexedDB, falling back to localStorage:', dbError);
        saveImageToLocalStorage(processedImageData);
      }

      // Update recent images state
      setRecentImages((prev) => {
        const updated = prev.filter((item) => item.name !== file.name);
        updated.unshift(processedImageData);
        return updated.slice(0, 10); // Keep only 10 most recent
      });
      
      if (processedImageData.compressed) {
        console.log(`Image compressed from ${formatFileSize(processedImageData.originalSize)} to ${formatFileSize(processedImageData.size)}`);
      }
      
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Failed to process image. Please try again.');
      setLoadingImage(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Check if it's an image file
      if (file.type.startsWith('image/')) {
        // Simulate the file input change event
        const mockEvent = {
          target: {
            files: [file]
          }
        };
        handleImageUpload(mockEvent);
      } else {
        alert('Please drop an image file');
      }
    }
  };

  const selectRecentImage = (imageMetadata) => {
    setLoadingImage(true);
    const uri = imageMetadata.dataUrl;
    setImageUri(uri);

    const img = new Image();
    img.onload = () => {
      setImageWidth(img.width);
      setImageHeight(img.height);
      setLoadedImage(img);
      setLoadingImage(false);
    };
    img.src = uri;
    setShowRecentImages(false);
  };

  // Function to handle image selection in edit mode
  const handleSelectImage = (imageId) => {
    setSelectedImages((prevSelected) => {
      if (prevSelected.includes(imageId)) {
        return prevSelected.filter((id) => id !== imageId);
      } else {
        return [...prevSelected, imageId];
      }
    });
  };

  // Function to delete selected images
  const handleDeleteSelectedImages = async () => {
    try {
      // Delete from IndexedDB (with localStorage fallback)
      const success = await deleteImagesFromDB(selectedImages);
      if (!success) {
        console.warn('Failed to delete from IndexedDB, updating localStorage');
        // Update localStorage as fallback
        const updatedLocalImages = loadImagesFromLocalStorage().filter(
          (img) => !selectedImages.includes(img.id)
        );
        localStorage.setItem('recentImages', JSON.stringify(updatedLocalImages));
      }
      
      // Update state
      const updatedImages = recentImages.filter(
        (imageMetadata) => !selectedImages.includes(imageMetadata.id)
      );
      setRecentImages(updatedImages);
      setSelectedImages([]);
      setIsEditing(false);
      
      console.log(`Deleted ${selectedImages.length} images`);
    } catch (error) {
      console.error('Failed to delete images:', error);
      alert('Failed to delete some images. Please try again.');
    }
  };

  // Function to adjust the number of levels
  const adjustLevels = (change) => {
    let newLevels = levels + change;
    if (newLevels < 2) newLevels = 2;
    if (newLevels > 11) newLevels = 11;

    if (newLevels !== levels) {
      setLevels(newLevels);
      const initialRange = 1 / newLevels;
      setLevelRanges(Array(newLevels).fill(initialRange));
    }
  };

  // Function to adjust individual level ranges
  const adjustLevelRange = (index, value) => {
    let newRanges = [...levelRanges];
    newRanges[index] = value;

    // Ensure the sum equals 1
    const total = newRanges.reduce((acc, val) => acc + val, 0);

    // Normalize the ranges
    newRanges = newRanges.map((val) => val / total);

    setLevelRanges(newRanges);
  };

  // Function to reset sliders to default
  const resetSliders = () => {
    const initialRange = 1 / levels;
    setLevelRanges(Array(levels).fill(initialRange));
  };

  // Function to reset all colors to default
  const resetAllColors = () => {
    const defaultColors = generateDefaultGrayscaleColors(levels);
    setLevelColors(defaultColors);
  };

  // Function to save the shaded image
  const saveImage = () => {
    console.log('Save image clicked');
    
    if (!imageUri || !loadedImage) {
      alert('No image to save. Please load an image first.');
      return;
    }
    
    try {
      // Get the WebGL canvas from the Surface ref
      if (!surfaceRef.current) {
        alert('Surface reference not available. Please try again.');
        return;
      }
      
      // Try different methods to get the canvas from gl-react Surface
      let canvas = null;
      
      // Method 1: Check if there's a canvas property
      if (surfaceRef.current.canvas) {
        canvas = surfaceRef.current.canvas;
      }
      // Method 2: Check if there's a _canvas property  
      else if (surfaceRef.current._canvas) {
        canvas = surfaceRef.current._canvas;
      }
      // Method 3: Try to find canvas in the DOM as fallback
      else {
        const surfaceElement = surfaceRef.current;
        if (surfaceElement && surfaceElement.querySelector) {
          canvas = surfaceElement.querySelector('canvas');
        } else {
          // Last resort - find any canvas in the component
          canvas = document.querySelector('canvas');
        }
      }
      
      console.log('Canvas found:', canvas);
      console.log('Surface ref:', surfaceRef.current);
      
      if (!canvas) {
        alert('Unable to get canvas. Make sure an image is loaded.');
        return;
      }
      
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      
      // Check if canvas has any content by checking WebGL context
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        console.log('WebGL context found, forcing render flush');
        gl.finish();
        gl.flush();
      }
      
      // Try dataURL method first as it's more reliable for WebGL canvases
      try {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            const filename = `valueator-image-${Date.now()}.png`;
            saveAs(blob, filename);
            console.log('Image saved successfully:', filename, 'Size:', blob.size, 'bytes');
          } else {
            console.warn('Blob is empty, trying dataURL method');
            // Fallback to data URL method
            const dataURL = canvas.toDataURL('image/png');
            if (dataURL && dataURL !== 'data:,') {
              const link = document.createElement('a');
              link.download = `valueator-image-${Date.now()}.png`;
              link.href = dataURL;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              console.log('Image saved via dataURL method');
            } else {
              alert('Unable to capture image data. The canvas may be empty or corrupted.');
            }
          }
        }, 'image/png');
      } catch (blobError) {
        console.error('toBlob failed:', blobError);
        // Fallback to data URL method
        try {
          const dataURL = canvas.toDataURL('image/png');
          if (dataURL && dataURL !== 'data:,') {
            const link = document.createElement('a');
            link.download = `valueator-image-${Date.now()}.png`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('Image saved via dataURL fallback method');
          } else {
            alert('Unable to capture image data. The canvas appears to be empty.');
          }
        } catch (dataURLError) {
          console.error('dataURL fallback failed:', dataURLError);
          alert('Failed to save image. Both toBlob and toDataURL methods failed.');
        }
      }
      
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save image: ' + error.message);
    }
  };

  // Calculate cumulative thresholds
  const thresholds = levelRanges
    .reduce((acc, val) => {
      const last = acc.length > 0 ? acc[acc.length - 1] : 0;
      acc.push(last + val);
      return acc;
    }, [])
    .slice(0, levels - 1); // Remove last element to have levels -1 thresholds

  // Pad thresholds to 10 with 1.0
  while (thresholds.length < 10) {
    thresholds.push(1.0);
  }

  // Calculate aspect ratio and display dimensions
  const aspectRatio =
    imageWidth && imageHeight && imageWidth !== 0
      ? imageHeight / imageWidth
      : 1;

  const maxImageWidth = 600; // Maximum image width in pixels

  const imageDisplayWidth =
    windowWidth >= 768
      ? Math.min(windowWidth / 2 - 40, maxImageWidth) // For desktop
      : Math.min(windowWidth * 0.9, maxImageWidth); // For mobile

  const imageDisplayHeight = imageDisplayWidth * aspectRatio;

  // Function to convert HSV to CSS color
  const hsvToCss = ({ h, s, v }) => {
    const rgb = HSVtoRGB(h, s, v);
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Fullscreen handler
  const handleImageClick = () => {
    if (imageUri && loadedImage && !loadingImage) {
      setIsFullscreen(true);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Valueator</h1>
        <p className="app-subtitle">Professional Value Study Tool for Artists</p>
      </header>
      <div className="main-content">
        {/* Main Image Display */}
        <div 
          className={`image-container ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {imageUri && loadedImage ? (
            !loadingImage && imageWidth && imageHeight ? (
              <Surface
                width={imageDisplayWidth}
                height={imageDisplayHeight}
                webglContextAttributes={{ preserveDrawingBuffer: true }}
                style={{ 
                  maxWidth: '100%',
                  width: `${imageDisplayWidth}px`,
                  height: `${imageDisplayHeight}px`,
                  cursor: 'pointer',
                  display: 'block',
                  margin: '0 auto'
                }}
                ref={surfaceRef}
                onClick={handleImageClick}
              >
                <Node
                  shader={shaders.imageShader}
                  uniforms={{
                    image: imageUri, // Pass imageUri, not loadedImage
                    thresholds: thresholds,
                    isGrayscale: isGrayscale ? 1.0 : 0.0,
                    levelColors: getLevelColors(),
                  }}
                />
              </Surface>
            ) : (
              <div className="loading">Loading Image</div>
            )
          ) : (
            <div 
              className={`image-placeholder ${isDragOver ? 'drag-over' : ''}`}
              onClick={() => setShowRecentImages(true)}
              style={{ cursor: 'pointer' }}
            >
              {isDragOver ? 'Drop image here' : 'No Image Selected'}
              <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
                Drag and drop an image or click here to browse
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="controls-container">
          {/* Level Controls */}
          <div className="level-controls">
            <button onClick={() => adjustLevels(-1)}>
              <FaMinusCircle size={20} />
            </button>
            <span>Levels: {levels}</span>
            <button onClick={() => adjustLevels(1)}>
              <FaPlusCircle size={20} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            {/* Color Toggle */}
            <button onClick={() => setIsGrayscale(!isGrayscale)} className="action-btn">
              <IoMdColorPalette size={24} />
              <p>Color</p>
            </button>

            {/* Sliders Toggle */}
            <button onClick={() => setShowSliders(!showSliders)} className="action-btn">
              <FaCog size={24} />
              <p>Sliders</p>
            </button>

            {/* Save Image Button */}
            {imageUri && (
              <button onClick={saveImage} className="action-btn">
                <FaSave size={24} />
                <p>Save</p>
              </button>
            )}

            {/* Images Button */}
            <button onClick={() => setShowRecentImages(true)} className="action-btn">
              <FaImages size={24} />
              <p>Images</p>
            </button>
          </div>

          {/* Sliders */}
          {showSliders && (
            <div className="sliders-panel">
              {levelRanges.map((range, index) => (
                <div key={index} className="slider-row">
                  <div className="slider-label">
                    <div className="layer-name">Layer {index + 1}</div>
                    <div className="layer-percentage">{(range * 100).toFixed(1)}%</div>
                  </div>
                  <div className="slider-container">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={range}
                      onChange={(e) => adjustLevelRange(index, parseFloat(e.target.value))}
                    />
                    <button
                      onClick={() => {
                        setCurrentColorLevel(index);
                        setColorPickerVisible(true);
                        setTempColor(levelColors[index]);
                      }}
                      className="color-picker-btn"
                      style={{
                        backgroundColor: hsvToCss(levelColors[index]),
                      }}
                    />
                  </div>
                </div>
              ))}
              {/* Reset Buttons */}
              <div className="reset-buttons">
                <button onClick={resetSliders} className="reset-btn">
                  Reset Sliders
                </button>
                <button onClick={resetAllColors} className="reset-btn">
                  Reset Colors
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HSV Color Picker Modal */}
      {colorPickerVisible && (
        <HSVColorPickerModal
          initialHSV={tempColor}
          onClose={() => {
            setColorPickerVisible(false);
            setTempColor(null);
          }}
          onChange={(hsv) => {
            setTempColor(hsv);
          }}
          onConfirm={() => {
            if (tempColor) {
              const newLevelColors = [...levelColors];
              newLevelColors[currentColorLevel] = tempColor;
              setLevelColors(newLevelColors);
              setTempColor(null);
              setColorPickerVisible(false);
            } else {
              alert('No color selected');
            }
          }}
          onReset={() => {
            const defaultColor = generateDefaultGrayscaleColors(levels)[currentColorLevel];
            setTempColor(defaultColor);
          }}
          levelNumber={currentColorLevel + 1}
        />
      )}

      {/* Recent Images Modal */}
      {showRecentImages && (
        <div className="modal-overlay" onClick={() => setShowRecentImages(false)}>
          <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <h3>Recent Images</h3>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="modal-btn">
                  Edit
                </button>
              ) : (
                <button onClick={() => setIsEditing(false)} className="modal-btn">
                  Cancel
                </button>
              )}
            </div>
            {/* Image Grid */}
            <div className="image-grid">
              {recentImages.length === 0 ? (
                <div 
                  className={`modal-empty-state ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{ cursor: 'pointer' }}
                >
                  <label htmlFor="file-input" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                      {isDragOver ? 'Drop image here' : 'No Images Found'}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.7, textAlign: 'center', color: '#666' }}>
                      Drag and drop an image or click here to browse
                    </div>
                  </label>
                </div>
              ) : (
                recentImages.map((imageMetadata) => {
                const isSelected = selectedImages.includes(imageMetadata.id);
                return (
                  <div
                    key={imageMetadata.id}
                    className="image-grid-item"
                  >
                    <img
                      src={imageMetadata.thumbnailUrl || imageMetadata.dataUrl}
                      alt={imageMetadata.name || "Recent"}
                      style={{
                        opacity: isSelected ? 0.7 : 1,
                      }}
                      onClick={() => {
                        if (isEditing) {
                          handleSelectImage(imageMetadata.id);
                        } else {
                          selectRecentImage(imageMetadata);
                        }
                      }}
                    />
                    {isEditing && isSelected && (
                      <div className="check-icon">
                        <FaCheckCircle
                          size={20}
                          color="#4facfe"
                        />
                      </div>
                    )}
                  </div>
                );
                })
              )}
            </div>
            {/* Modal Bottom Row */}
            <div className="reset-buttons">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedImages([]);
                    }}
                    className="modal-btn"
                  >
                    Cancel
                  </button>
                  <button onClick={handleDeleteSelectedImages} className="reset-btn">
                    <FaTrash /> Delete Selected
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowRecentImages(false)} className="modal-btn">
                    Close
                  </button>
                  <button className="modal-btn">
                    <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaPlusCircle /> Add Image
                    </label>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                    />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {isFullscreen && imageUri && (
        <div 
          className="fullscreen-modal-overlay" 
          onClick={() => setIsFullscreen(false)}
        >
          <div className="fullscreen-modal-content">
            <Surface
              width={imageDisplayWidth}
              height={imageDisplayHeight}
              webglContextAttributes={{ preserveDrawingBuffer: true }}
              style={{ 
                maxWidth: '95vw',
                maxHeight: '95vh',
                width: `${imageDisplayWidth}px`,
                height: `${imageDisplayHeight}px`,
                objectFit: 'contain'
              }}
            >
              <Node
                shader={shaders.imageShader}
                uniforms={{
                  image: imageUri,
                  thresholds: thresholds,
                  isGrayscale: isGrayscale ? 1.0 : 0.0,
                  levelColors: getLevelColors(),
                }}
              />
            </Surface>
            <button 
              className="fullscreen-close-btn"
              onClick={() => setIsFullscreen(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles moved to CSS classes

export default App;
