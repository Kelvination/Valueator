// App.js
import { Node, Shaders } from 'gl-react';
import { Surface } from 'gl-react-dom';
import { useEffect, useRef, useState } from 'react';
import { FaCog, FaImages, FaMinusCircle, FaPlusCircle, FaSave } from 'react-icons/fa';
import { IoMdColorPalette } from 'react-icons/io';
import './App.css';
import HSVColorPickerModal from './components/HSVColorPickerModal/HSVColorPickerModal';
import RecentImagesModal from './components/RecentImagesModal/RecentImagesModal';
import styles from './AppStyles';

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
  const [showSliders, setShowSliders] = useState(false);
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

  useEffect(() => {
    // Update window width on resize
    const handleResize = () => setWindowWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    const images = localStorage.getItem('recentImages');
    if (images) {
      const parsedImages = JSON.parse(images);
      setRecentImages(parsedImages);

      // Automatically load the most recent image
      if (parsedImages.length > 0) {
        const uri = parsedImages[0];
        setLoadingImage(true);

        const img = new Image();
        img.onload = () => {
          setImageWidth(img.width);
          setImageHeight(img.height);
          setLoadedImage(img); // Set the loaded image object
          setImageUri(uri);
          setLoadingImage(false);
        };
        img.onerror = () => {
          setImageWidth(100);
          setImageHeight(100);
          setLoadingImage(false);
        };
        img.src = uri;
      }
    }
  }, []);

  // Save recent images to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('recentImages', JSON.stringify(recentImages));
  }, [recentImages]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoadingImage(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const uri = e.target.result;
        setImageUri(uri); // Set the image URI

        // Create a new Image object to get dimensions
        const img = new Image();
        img.onload = () => {
          setImageWidth(img.width);
          setImageHeight(img.height);
          setLoadedImage(img);
          setLoadingImage(false);
        };
        img.src = uri;

        // Add to recent images
        setRecentImages((prev) => {
          let updated = prev.filter((item) => item !== uri);
          updated.unshift(uri);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    } else {
      alert('No image selected');
    }
  };

  const selectRecentImage = (uri) => {
    setLoadingImage(true);
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
    if (!surfaceRef.current) {
      alert('No image to save.');
      return;
    }
    try {
      const canvas = surfaceRef.current.getGLCanvas();
      const dataURL = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.download = 'image.png';
      link.href = dataURL;
      link.click();

      alert('Image saved!');
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save image.');
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

  return (
    <div className="app-container">
      <div className="main-content">
        {/* Main Image Display */}
        <div className="image-container">
          {imageUri && loadedImage ? (
            !loadingImage && imageWidth && imageHeight ? (
              <Surface
                width={imageDisplayWidth}
                height={imageDisplayHeight}
                style={{ width: '100%', height: 'auto' }}
                ref={surfaceRef}
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
              <p>Loading Image...</p>
            )
          ) : (
            <p>No Image Selected</p>
          )}
        </div>

        {/* Controls */}
        <div className="controls-container">
          {/* First Row of Buttons (Level Picker) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              marginTop: 20,
            }}
          >
            <button onClick={() => adjustLevels(-1)} style={styles.iconButton}>
              <FaMinusCircle size={32} />
            </button>
            <span style={{ margin: '0 10px' }}>Levels: {levels}</span>
            <button onClick={() => adjustLevels(1)} style={styles.iconButton}>
              <FaPlusCircle size={32} />
            </button>
          </div>

          {/* Second Row of Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              marginTop: 20,
              width: '100%',
            }}
          >
            {/* Color Toggle */}
            <button onClick={() => setIsGrayscale(!isGrayscale)} style={styles.iconButton}>
              <IoMdColorPalette size={24} />
              <p style={{ fontSize: 12 }}>Color</p>
            </button>

            {/* Sliders Toggle */}
            <button onClick={() => setShowSliders(!showSliders)} style={styles.iconButton}>
              <FaCog size={24} />
              <p style={{ fontSize: 12 }}>Sliders</p>
            </button>

            {/* Save Image Button */}
            {imageUri && (
              <button onClick={saveImage} style={styles.iconButton}>
                <FaSave size={24} />
                <p style={{ fontSize: 12 }}>Save</p>
              </button>
            )}

            {/* Images Button */}
            <button onClick={() => setShowRecentImages(true)} style={styles.iconButton}>
              <FaImages size={24} />
              <p style={{ fontSize: 12 }}>Images</p>
            </button>
          </div>

          {/* Sliders */}
          {showSliders && (
            <div
              style={{
                backgroundColor: '#eeeeee',
                marginTop: 20,
                padding: 10,
                width: '90%',
                borderRadius: 8,
              }}
            >
              {levelRanges.map((range, index) => (
                <div key={index} style={styles.sliderRow}>
                  <div style={styles.sliderLabel}>
                    <span>
                      L{index + 1}: {(range * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={styles.sliderContainer}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={range}
                      onChange={(e) => adjustLevelRange(index, parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                    {/* Color Picker Button */}
                    <button
                      onClick={() => {
                        setCurrentColorLevel(index);
                        setColorPickerVisible(true);
                        setTempColor(levelColors[index]);
                      }}
                      style={{
                        width: 24,
                        height: 24,
                        backgroundColor: hsvToCss(levelColors[index]),
                        borderRadius: '50%',
                        border: '1px solid #000',
                        marginLeft: 10,
                      }}
                    />
                  </div>
                </div>
              ))}
              {/* Reset Sliders and Reset Colors Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 10,
                }}
              >
                <button onClick={resetSliders} style={styles.resetButton}>
                  Reset Sliders
                </button>
                <button onClick={resetAllColors} style={styles.resetButton}>
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
        <RecentImagesModal 
          recentImages={recentImages}
          setRecentImages={setRecentImages}
          selectRecentImage={selectRecentImage}
          setShowRecentImages={setShowRecentImages}
          handleImageUpload={handleImageUpload}
        />
      )}
    </div>
  );
}


export default App;
