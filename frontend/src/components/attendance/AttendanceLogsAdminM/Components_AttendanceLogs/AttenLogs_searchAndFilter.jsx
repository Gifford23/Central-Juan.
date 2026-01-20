import React from 'react';

const SearchAndDateFilter = ({
  searchQuery, setSearchQuery,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  onTodayClick
}) => (
  <div className="flex flex-col items-center justify-center w-full py-2">
    <input
      type="text"
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-[80vw] p-2 my-1 text-center border rounded-[5px] mx-3 text-black"
    />

    <div className="flex flex-row w-[80vw] justify-evenly">
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="w-full mx-1 text-center border rounded-[5px]"
      />
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="w-full mx-1 text-center border rounded-[5px]"
      />
    </div>

    <button
      onClick={onTodayClick}
      className="px-4 py-2 my-3 bg-blue-600 text-white rounded-[15px] hover:bg-blue-700 transition w-[60vw]"
    >
      Show Date Today
    </button>
  </div>
);

export default SearchAndDateFilter;
