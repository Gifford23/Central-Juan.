// PresentSummary.js

import React from 'react';

const PresentSummary = ({ onTimeMorningCount, earlyMorningCount, lateMorningCount, onTimeAfternoonCount, earlyAfternoonCount, lateAfternoonCount }) => {
  return (
    <article className="SummaryCard_box-presentsummary items-left">
      <div className="g1 flex flex-row place-content-between">
        <div className="flex flex-row items-center gap-3 ">
          <span className="rounded-full bg-blue-100 p-2 text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </span>
          <p className="Present text-lg"> Present Summary </p>
        </div>
        <svg className="w-12" data-slot="icon" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"></path>
        </svg>
      </div>

      <div className="flex flex-row gap-x-10">
        {/* Morning Summary */}
        <div className="attendance-psummary">
          <div className="p_card-title">Morning Summary</div>
          <div className="attendance-p-morningsummary">
            <div className="attd-p-groups flex flex-col gap-2">
              <p className="p_card text-sm text-gray-500">On time</p>
              <div className="flex flex-row gap-3 border-l-2 border-gray-400 pl-3">
                <p className="p_card_num">{onTimeMorningCount}</p>
              </div>
            </div>
            <div className="attd-p-groups flex flex-col gap-2">
              <p className="p_card text-sm text-gray-500">Early time-in</p>
              <div className="flex flex-row gap-3 border-l-2 border-gray-400 pl-3">
                <p className="p_card_num">{earlyMorningCount}</p>
              </div>
            </div>
            <div className="attd-p-groups flex flex-col gap-2">
              <p className="p_card text-sm text-gray-500">Late time-in</p>
              <div className="flex flex-row gap-3 border-l-2 border-gray-400 pl-3">
                <p className="p_card_num">{lateMorningCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Afternoon Summary */}
        <div className="attendance-psummary">
          <div className="p_card -title">Afternoon Summary</div>
          <div className="attendance-p-morningsummary">
            <div className="attd-p-groups flex flex-col gap-2">
              <p className="p_card text-sm text-gray-500">On time</p>
              <div className="flex flex-row gap-3 border-l-2 border-gray-400 pl-3">
                <p className="p_card_num">{onTimeAfternoonCount}</p>
              </div>
            </div>
            <div className="attd-p-groups flex flex-col gap-2">
              <p className="p_card text-sm text-gray-500">Early time-in</p>
              <div className="flex flex-row gap-3 border-l-2 border-gray-400 pl-3">
                <p className="p_card_num">{earlyAfternoonCount}</p>
              </div>
            </div>
            <div className="attd-p-groups flex flex-col gap-2">
              <p className="p_card text-sm text-gray-500">Late time-in</p>
              <div className="flex flex-row gap-3 border-l-2 border-gray-400 pl-3">
                <p className="p_card_num">{lateAfternoonCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PresentSummary;