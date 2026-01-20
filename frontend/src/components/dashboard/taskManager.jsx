import React, { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import BestCalendar from './BestCalendar'; // if you want a modal full calendar
import BASE_URL from '../../../backend/server/config';
const TaskManagement = ({
  selectedDate,
  setSelectedDate,
  handlePrevMonth,
  handleNextMonth,
  handleDateClick,
  tasks,
  showTasks,
  setShowTasks,
  handleShowTasks,
  showAddTask,
  setShowAddTask,
  handleShowAddTask,
  holidays
}) => {
  const [birthdays, setBirthdays] = useState([]);
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  useEffect(() => {
    // Fetch employees for birthdays
    fetch(`${BASE_URL}/employeesSide/employees.php`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(emp => ({
          name: `${emp.first_name} ${emp.last_name}`,
          date: emp.date_of_birth
        }));
        setBirthdays(formatted);
      })
      .catch(err => console.error('Error fetching employees:', err));
  }, []);

  const daysInMonth = Array.from(
    { length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() },
    (_, i) => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1)
  );
  const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();

  return (
    <div className="flex flex-col p-4 bg-white shadow-lg rounded-2xl w-full max-w-full md:max-w-[400px] lg:w-full mx-auto" style={{ height: '40vh' }}>
      {/* Header controls */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={handlePrevMonth} className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded hover:bg-gray-300">Prev</button>
        <div className="text-center">
          <div className="text-xs font-semibold">{format(selectedDate, 'yyyy')}</div>
          <div className="text-sm font-light">{format(selectedDate, 'MMMM')}</div>
        </div>
        <button onClick={handleNextMonth} className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded hover:bg-gray-300">Next</button>
      </div>

      {/* Expand Calendar Button */}
      <div className="flex justify-center mb-2">
        <button
          onClick={() => setShowFullCalendar(true)}
          className="px-3 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Expand Calendar
        </button>
      </div>

      {/* Mini Calendar */}
      {!showAddTask && !showTasks && (
        <div className="grid flex-grow min-h-0 grid-cols-7 gap-1 mb-2 overflow-y-auto text-center text-gray-600">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
            <div key={day} className={`text-[10px] font-medium ${day==='Sun' ? 'text-red-500':''}`}>{day}</div>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => <div key={`empty-${index}`}></div>)}
          {daysInMonth.map(day => {
            const dateKey = format(day,'yyyy-MM-dd');
            const hasTasks = tasks[dateKey]?.length > 0;
            const isToday = isSameDay(day, new Date());
            const isSunday = day.getDay() === 0;

            // Find holiday for this day
            const holidayForDay = (holidays || []).find(h => {
              const d = new Date(h.holiday_date);
              if(h.is_recurring) return d.getDate() === day.getDate() && d.getMonth() === day.getMonth();
              return isSameDay(d, day);
            });

            // Find birthdays for this day
            const birthdaysForDay = (birthdays || []).filter(b => {
              const d = new Date(b.date);
              return d.getDate() === day.getDate() && d.getMonth() === day.getMonth();
            });

            return (
              <div
                key={dateKey}
                onClick={()=>handleDateClick(day)}
                className={`cursor-pointer flex items-center justify-center w-6 h-6 rounded-full text-[10px]
                  ${isSameDay(day, selectedDate) ? 'bg-blue-500 text-white' : ''}
                  ${isToday ? 'border border-blue-500' : ''}
                  ${hasTasks ? 'bg-green-200 text-green-800' : ''}
                  ${holidayForDay ? 'bg-red-300 text-red-800 font-bold' : ''}
                  ${birthdaysForDay.length > 0 ? 'bg-yellow-300 text-yellow-800 font-bold' : ''}
                  ${!isSameDay(day,selectedDate) && isSunday ? 'text-red-500':''}`}
                title={
                  holidayForDay ? holidayForDay.name
                  : birthdaysForDay.length > 0 ? birthdaysForDay.map(b=>b.name).join(', ')
                  : ''
                }
              >
                {format(day,'d')}
              </div>
            )
          })}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-between mt-auto">
        {!showAddTask && !showTasks ? (
          <>
            <button onClick={()=>{handleShowTasks(); setShowAddTask(false)}} className="px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600">Show Tasks</button>
            <button onClick={()=>{handleShowAddTask(); setShowTasks(false)}} className="px-2 py-1 text-xs text-white bg-green-500 rounded hover:bg-green-600">Add Task</button>
          </>
        ) : (
          <button onClick={()=>{setShowAddTask(false); setShowTasks(false)}} className="px-2 py-1 text-xs text-white bg-gray-500 rounded hover:bg-gray-600">Back</button>
        )}
      </div>

      {/* Expanded Calendar Modal */}
{showFullCalendar && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white p-4 rounded-2xl shadow-xl w-[90%] max-w-6xl relative">
      <button
        onClick={() => setShowFullCalendar(false)}
        className="absolute top-2 right-2 px-3 py-1 text-sm font-medium rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition shadow-sm"
        aria-label="Close calendar"
      >
        Close
      </button>
      <BestCalendar
        initialDate={selectedDate}
        events={tasks}
        holidays={holidays}
        onDateClick={date => { handleDateClick(date); setShowFullCalendar(false); }}
      />
    </div>
  </div>
)}


    </div>
  )
}

export default TaskManagement;
