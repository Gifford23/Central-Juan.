// Toggle.jsx
import React from 'react';

const ToggleButton = ({ label, isActive, onClick, badgeCount = 0 }) => {
  return (
    <div onClick={onClick} className={`relative cursor-pointer px-3 py-1 rounded-md font-medium text-sm transition-all
      ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-600 hover:bg-blue-100'}`}>
      
      {label}

      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center z-1">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </div>
  );
};

export default ToggleButton;

