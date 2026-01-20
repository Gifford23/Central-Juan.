import React from "react";

const Calendar = () => {
  const weeks = [
    [null, null, null, null, null, null, 1],
    [2, 3, 4, 5, 6, 7, 8],
    [9, 10, 11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20, 21, 22],
    [23, 24, 25, 26, 27, 28, null],
  ];

  const blueUnderlineDays = [3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 24, 25];
  const yellowUnderlineDays = [1, 26, 27, 28];

  return (
    <div className="flex h-full ">
      <div className="grid grid-cols-7 text-center h-full place-items-center text-gray-700 grow">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
          <div key={index} className={`font-semibold text-4xl sm:text-xl md:text-2xl lg:text-4xl
                                      ${index === 0 || index === 6 ? "text-blue-600" : ""}
                                    `}>
            {day}
          </div>
        ))}
        {weeks.flat().map((day, index) => (
          <div key={index} className="flex grow items-center justify-center relative border-[1px] border-gray-400 bg-gray-100
                                      rounded-2xl md:rounded-xl
                                      h-full w-full"
          >
            {/* sm:h-10 md:h-15 lg:h-20 xl:h-30 */}
            {day && (
              <>
                <span className={`text-gray-700 ${index % 7 === 0 ? "text-blue-600" : ""}`}>{day}</span>
                {blueUnderlineDays.includes(day) && (
                  <div className="absolute bottom-2 left-1/2 w-4/5 h-1 bg-blue-500 rounded-full transform -translate-x-1/2"></div>
                )}
                {yellowUnderlineDays.includes(day) && (
                  <div className="absolute bottom-2 left-1/2 w-3/4 h-1 bg-yellow-500 rounded-full transform -translate-x-1/2"></div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
