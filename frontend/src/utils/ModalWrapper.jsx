// components/ui/ModalWrapper.jsx
import React from "react";

const ModalWrapper = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-[90%] max-w-6xl p-6 bg-white rounded-2xl shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 px-3 py-1 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
        >
          Close ✖
        </button>
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
