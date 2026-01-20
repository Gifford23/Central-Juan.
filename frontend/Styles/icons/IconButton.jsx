import React from "react";
import { SquarePen, Trash2 } from "lucide-react";

const typeStyles = {
  edit: "bg-blue-100 text-blue-600 hover:bg-blue-200",
  delete: "bg-red-100 text-red-600 hover:bg-red-200",
  default: "bg-gray-100 text-gray-600 hover:bg-gray-200",
  disabled: "bg-gray-200 text-gray-400 cursor-not-allowed",
};

// map variant to icon
const icons = {
  edit: SquarePen,
  delete: Trash2,
};

const IconButton = ({ 
  title, 
  onClick, 
  variant = "default", 
  size = 20, 
  disabled = false, 
}) => {
  const Icon = icons[variant] || null;

  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200
        ${disabled ? typeStyles.disabled : typeStyles[variant] || typeStyles.default}`}
    >
      {Icon ? <Icon size={size} /> : null}
    </button>
  );
};

export default IconButton;
