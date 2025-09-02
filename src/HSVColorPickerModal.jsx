/* eslint-disable react/prop-types */
// HSVColorPickerModal.js
// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import './HSVColorPickerModal.css';

function HSVColorPickerModal({ initialHSV, onClose, onChange, onConfirm, onReset, levelNumber }) {
  const [hsv, setHSV] = useState(initialHSV);

  useEffect(() => {
    onChange(hsv);
  }, [hsv, onChange]);

  const handleHueChange = (e) => {
    setHSV({ ...hsv, h: parseFloat(e.target.value) });
  };

  const handleSaturationChange = (e) => {
    setHSV({ ...hsv, s: parseFloat(e.target.value) });
  };

  const handleValueChange = (e) => {
    setHSV({ ...hsv, v: parseFloat(e.target.value) });
  };

  const hsvToCss = ({ h, s, v }) => {
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

    r = Math.round(r * 255);
    g = Math.round(g * 255);
    b = Math.round(b * 255);

    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="hsv-modal"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h3>Select Color for Level {levelNumber}</h3>
        <div
          className="color-display"
          style={{ backgroundColor: hsvToCss(hsv) }}
        ></div>
        <div className="hsv-slider-container">
          <label>
            Hue: {Math.round(hsv.h * 360)}°
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={hsv.h}
              onChange={handleHueChange}
            />
          </label>
          <label>
            Saturation: {Math.round(hsv.s * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={hsv.s}
              onChange={handleSaturationChange}
            />
          </label>
          <label>
            Value: {Math.round(hsv.v * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={hsv.v}
              onChange={handleValueChange}
            />
          </label>
        </div>
        <div className="modal-buttons">
          <button onClick={onClose}>Cancel</button>
          <button onClick={onReset}>Reset</button>
          <button onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default HSVColorPickerModal;
