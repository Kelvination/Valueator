// App.js
import { Node, Shaders } from 'gl-react';
import { Surface } from 'gl-react-dom';
import { useEffect, useRef, useState } from 'react';
import { FaCheckCircle, FaCog, FaImages, FaMinusCircle, FaPlusCircle, FaSave, FaTrash } from 'react-icons/fa';
import { saveAs } from 'file-saver';
import { IoMdColorPalette } from 'react-icons/io';
import './App.css';
import HSVColorPickerModal from './HSVColorPickerModal';

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
  }, []);

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

  // Load recent images from localStorage
  useEffect(() => {
    try {
      // Clean up old metadata-only storage key if it exists
      const oldMetadata = localStorage.getItem('recentImagesMetadata');
      if (oldMetadata) {
        localStorage.removeItem('recentImagesMetadata');
      }
      
      // Load recent images with data URLs
      const imagesJson = localStorage.getItem('recentImages');
      if (imagesJson) {
        const parsedImages = JSON.parse(imagesJson);
        setRecentImages(parsedImages);
        console.log('Loaded', parsedImages.length, 'recent images from previous session.');
      }
    } catch (error) {
      console.warn('Failed to load recent images from localStorage:', error);
      try {
        localStorage.removeItem('recentImages');
      } catch (clearError) {
        console.warn('Failed to clear corrupted images from localStorage:', clearError);
      }
    }
  }, []);

  // Save recent images to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('recentImages', JSON.stringify(recentImages));
    } catch (error) {
      console.warn('Failed to save recent images to localStorage:', error);
      // If quota exceeded, try saving fewer images
      if (error.name === 'QuotaExceededError') {
        try {
          const limitedImages = recentImages.slice(0, 3);
          localStorage.setItem('recentImages', JSON.stringify(limitedImages));
          setRecentImages(limitedImages);
          console.log('Reduced recent images to 3 due to storage quota');
        } catch (secondError) {
          console.warn('Failed to save even limited images:', secondError);
          try {
            localStorage.removeItem('recentImages');
            setRecentImages([]);
          } catch (clearError) {
            console.warn('Failed to clear images from localStorage:', clearError);
          }
        }
      }
    }
  }, [recentImages]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoadingImage(true);
      
      // Read file as data URL for persistence
      const reader = new FileReader();
      reader.onload = (e) => {
        const uri = e.target.result;
        setImageUri(uri);

        // Create a new Image object to get dimensions
        const img = new Image();
        img.onload = () => {
          setImageWidth(img.width);
          setImageHeight(img.height);
          setLoadedImage(img);
          setLoadingImage(false);
        };
        img.src = uri;

        // Store complete image data for persistence
        const fileMetadata = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          dataUrl: uri
        };

        // Add to recent images
        setRecentImages((prev) => {
          const updated = prev.filter((item) => item.name !== file.name);
          updated.unshift(fileMetadata);
          // Keep only 10 most recent images
          return updated.slice(0, 10);
        });
      };
      
      reader.readAsDataURL(file);
    } else {
      alert('No image selected');
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
  const handleDeleteSelectedImages = () => {
    // Delete selected images
    
    const updatedImages = recentImages.filter(
      (imageMetadata) => !selectedImages.includes(imageMetadata.id)
    );
    setRecentImages(updatedImages);
    setSelectedImages([]);
    setIsEditing(false);
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
    console.log('surfaceRef.current:', surfaceRef.current);
    
    if (!surfaceRef.current) {
      alert('No image to save. Surface ref not available.');
      return;
    }
    
    try {
      const canvas = surfaceRef.current.getGLCanvas();
      console.log('Canvas:', canvas);
      
      if (!canvas) {
        alert('Unable to get WebGL canvas.');
        return;
      }
      
      // Convert canvas to blob and save using file-saver
      canvas.toBlob((blob) => {
        if (blob) {
          const filename = `valueator-image-${Date.now()}.png`;
          saveAs(blob, filename);
          console.log('Image saved:', filename);
        } else {
          // Fallback to data URL method
          const dataURL = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `valueator-image-${Date.now()}.png`;
          link.href = dataURL;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log('Image saved via fallback method');
        }
      }, 'image/png');
      
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
                      src={imageMetadata.dataUrl}
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
              width={Math.min(window.innerWidth - 40, imageWidth)}
              height={Math.min(window.innerHeight - 40, imageHeight)}
              style={{ maxWidth: '100vw', maxHeight: '100vh' }}
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
