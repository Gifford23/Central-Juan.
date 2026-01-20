import React from 'react';

const ToggleButton = ({ label, isActive, onClick }) => {
    return (
        <div 
            onClick={onClick} 
            className={`request-button 
                ${isActive ? 'bg-[#0080f0] text-[#f8f9fa]' : 'text-[#0088f0] bg-[#f8f9fa]'}
            `}
        >
            {label}
        </div>
    );
};

export default ToggleButton;
