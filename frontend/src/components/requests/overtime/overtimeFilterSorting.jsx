import { AlignJustify, CalendarArrowDown, CalendarArrowUp, ClockArrowDown, ClockArrowUp, Grid3x3, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

const OvertimeSorting = ({ statusFilter, sortAscending, onStatusChange, onSortChange }) => {
  const [selectedSort, setSelectedSort] = useState(sortAscending ? 'asc' : 'desc');

  // Options for sort
  const sortOptions = ["asc", "desc"];

  const handleSortClick = (option) => {
    setSelectedSort(option);
    onSortChange(option === 'asc');
  };

  return (
    <div className="flex flex-row h-10 overflow-hidden border rounded-lg w-fit divide-x-1 employee-newheaderbuttons-outline">
        <div onClick={() => handleSortClick('asc')} 
            className={`w-10 content-center place-items-center cursor-pointer hover:bg-[#ACCCFC]/50
            ${selectedSort === 'asc' ? 'employee-newheaderbuttons-solid' : ''}
            `}
        >
            <CalendarArrowUp size={23}/>
        </div>
        <div onClick={() => handleSortClick('desc')} 
            className={`w-10 content-center place-items-center cursor-pointer hover:bg-[#ACCCFC]/50
            ${selectedSort === 'desc' ? 'employee-newheaderbuttons-solid' : ''}
            `}
        >
            <CalendarArrowDown size={23}/>
        </div>
    </div>
  );
};

export default OvertimeSorting;
