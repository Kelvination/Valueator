
export default {
    iconButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'center',
    },
    sliderRow: {
      display: 'flex',
      alignItems: 'center',
      margin: '5px 0',
      width: '100%',
    },
    sliderLabel: {
      width: 80,
      paddingLeft: 10,
    },
    sliderContainer: {
      display: 'flex',
      alignItems: 'center',
      flex: 1,
    },
    resetButton: {
      padding: 10,
      backgroundColor: '#f44336',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      width: 220,
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 20,
      textAlign: 'center',
    },
    modalContentLarge: {
      width: 500,
      maxWidth: '90%',
      maxHeight: '80%',
      overflowY: 'auto',
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 20,
    },
    modalButtons: {
      display: 'flex',
      justifyContent: 'space-around',
      marginTop: 20,
    },
    modalButton: {
      padding: 10,
      backgroundColor: '#2196F3',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
    },
    imageGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      marginTop: 10,
      minHeight: 200,
    },
    imageGridItem: {
      position: 'relative',
      margin: 5,
      width: 100,
      height: 100,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'gray'
    }
  };