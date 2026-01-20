import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react'; // Import your icons
import "../../../Styles/components/colorMode/negroblanco.css";

const NegroBlanco = () => {
  const [isGridView, setIsGridView] = useState(false); // State to track the current icon
  const [isDarkMode, setIsDarkMode] = useState(false);


  return (
    <div className="w-full flex justify-end">
      <div
        onClick={() => {
          toggleView();
          toggleDarkMode();
        }}
        className={`h-8 w-8 rounded-md border cursor-pointer flex items-center justify-center 
          ${isGridView ? '' : 'border-gray-500'}
        `}
      >
        {isDarkMode ? <Moon size={20} color='yellow' /> : <Sun size={20} />}
      </div>
    </div>
  );
};

export default NegroBlanco;

