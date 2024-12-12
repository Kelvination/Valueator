import { useState } from 'react';
import { FaPlusCircle, FaTrash, FaCheckCircle } from 'react-icons/fa';
import '../../App.css';
import styles from '../../AppStyles';

export default (
    {
        recentImages,
        setRecentImages,
        selectRecentImage,
        setShowRecentImages,
        handleImageUpload
    }
) => {
    const [isEditing, setIsEditing] = useState(false);
      const [selectedImages, setSelectedImages] = useState([]);
    // Function to delete selected images
    const handleDeleteSelectedImages = () => {
      const updatedImages = recentImages.filter(
        (uri) => !selectedImages.includes(uri)
      );
      setRecentImages(updatedImages);
      setSelectedImages([]);
        setIsEditing(false);
    };

    // Function to handle image selection in edit mode
    const handleSelectImage = (uri) => {
      setSelectedImages((prevSelected) => {
        if (prevSelected.includes(uri)) {
          return prevSelected.filter((item) => item !== uri);
        } else {
          return [...prevSelected, uri];
        }
      });
    };

    return (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentLarge}>
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid black',
                paddingBottom: 10,
              }}
            >
              <h3>Recent Images</h3>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} style={styles.modalButton}>
                  Edit
                </button>
              ) : (
                <button onClick={() => setIsEditing(false)} style={styles.modalButton}>
                  Cancel
                </button>
              )}
            </div>
            {/* Image Grid */}
            <div style={styles.imageGrid}>
              {recentImages.map((item) => {
                const isSelected = selectedImages.includes(item);
                return (
                  <div
                    key={item}
                    style={styles.imageGridItem}
                  >
                    <img
                      src={item}
                      alt="Recent"
                      style={{
                        width: '100%',
                        height: 'auto',
                        opacity: isSelected ? 0.7 : 1,
                      }}
                      onClick={() => {
                        if (isEditing) {
                          handleSelectImage(item);
                        } else {
                          selectRecentImage(item);
                        }
                      }}
                    />
                    {isEditing && isSelected && (
                      <FaCheckCircle
                        size={24}
                        color="blue"
                        style={{ position: 'absolute', top: 5, right: 5 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Modal Bottom Row */}
            {isEditing ? (
              <div style={styles.modalButtons}>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedImages([]);
                  }}
                  style={styles.modalButton}
                >
                  Cancel
                </button>
                <button onClick={handleDeleteSelectedImages} style={styles.modalButton}>
                  <FaTrash color="red" /> Delete
                </button>
              </div>
            ) : (
              <div style={styles.modalButtons}>
                <button onClick={() => setShowRecentImages(false)} style={styles.modalButton}>
                  Close
                </button>
                <button style={styles.modalButton}>
                  <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
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
              </div>
            )}
          </div>
        </div>
    );
}