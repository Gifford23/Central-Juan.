// CustomAlert.js
import React from 'react';
import '../../Styles/customAlert.css'; // Import the CSS for styling

const CustomAlert = ({ message, onClose }) => {
  return (
    <div className="custom-alert-overlay">
      <div className="custom-alert">
        <p>{message}</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default CustomAlert;