import React from 'react';

const statusOptions = ['All', 'Pending', 'Approved', 'Rejected'];

const StatusSummary = ({ counts = {}, activeStatus, onSelectStatus }) => {
  // normalize counts so missing keys default to 0
  const safeCounts = {
    Pending: counts.Pending || 0,
    Approved: counts.Approved || 0,
    Rejected: counts.Rejected || 0,
  };
 
  return (
    <div className="grid w-full grid-cols-2 gap-4 mb-6 sm:grid-cols-4 h-fit">
      {statusOptions.map((option) => {
        const isActive = activeStatus === option;

        const borderColor =
          option === 'All' ? 'border-blue-600' :
          option === 'Pending' ? 'border-yellow-600' :
          option === 'Approved' ? 'border-green-600' :
          'border-red-600';

        const bgColor =
          isActive
            ? (option === 'All' ? 'bg-blue-200' :
               option === 'Pending' ? 'bg-yellow-200' :
               option === 'Approved' ? 'bg-green-200' :
               'bg-red-200')
            : (option === 'All' ? 'bg-blue-100' :
               option === 'Pending' ? 'bg-yellow-100' :
               option === 'Approved' ? 'bg-green-100' :
               'bg-red-100');

        const badgeColor =
          option === 'All' ? 'border-blue-600 bg-blue-500/50' :
          option === 'Pending' ? 'border-yellow-600 bg-yellow-500/50' :
          option === 'Approved' ? 'border-green-600 bg-green-500/50' :
          'border-red-600 bg-red-500/50';

        return (
          <button
            key={option}
            onClick={() => onSelectStatus(option)}
            className={`flex flex-row h-fit border rounded-xl p-3 shadow-md cursor-pointer transition-all duration-200 ease-in-out
              ${bgColor} ${borderColor}
              ${isActive ? 'ring-2 ring-offset-2 ring-black/40' : ''}
            `}
          >
            <div
              className={`flex border h-fit w-25 px-2 py-1 rounded-md justify-center font-semibold text-sm ${badgeColor}`}
            >
              {option}
            </div>
            <div className="w-full text-3xl italic font-normal text-center">
              {option === 'All'
                ? (safeCounts.Pending + safeCounts.Approved + safeCounts.Rejected)
                : safeCounts[option]}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default StatusSummary;
