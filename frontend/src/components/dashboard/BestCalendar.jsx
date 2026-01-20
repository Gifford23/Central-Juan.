import React, { useState, useMemo, useEffect } from "react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, format, isSameMonth, isSameDay, parseISO, isToday, getYear } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import BASE_URL from "../../../backend/server/config";
// Day cell
const DayCell = ({ date, monthStart, selectedDate, eventsForDay, isHoliday, birthdays, onDayClick }) => {
  const inMonth = isSameMonth(date, monthStart);
  const today = isToday(date);

  return (
    <button
      onClick={() => onDayClick(date)}
      className={`group relative w-full h-20 p-2 flex flex-col items-start justify-between text-left rounded-lg transition-all border focus:outline-none focus:ring-2 focus:ring-sky-400
        ${inMonth ? "bg-white" : "bg-transparent text-slate-400"}
        ${isSameDay(date, selectedDate) ? "ring-2 ring-offset-1 ring-sky-500" : ""}
        ${today && !isSameDay(date, selectedDate) ? "border border-sky-300" : ""}`}
      aria-label={`Calendar day ${format(date, "yyyy-MM-dd")}`}
    >
      <div className="flex items-center justify-between w-full">
        <div className={`text-xs font-semibold ${isHoliday ? 'text-red-700' : inMonth ? 'text-slate-700' : 'text-slate-400'}`}>
          {format(date, "d")}
        </div>
        {today && <div className="text-[10px] px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full">Today</div>}
      </div>

      <div className="mt-1 w-full flex flex-col gap-1">
        {birthdays?.map((b) => (
          <div key={b.employee_id} className="flex items-center gap-1 text-[11px] font-medium truncate">
            🎉 {b.first_name}
          </div>
        ))}

        {eventsForDay?.slice(0, 3).map(ev => (
          <div key={ev.id} title={ev.title} className="flex items-center gap-2 w-full">
            <span className={`w-2 h-2 rounded-full shrink-0`} style={{ backgroundColor: ev.color || '#06b6d4' }} />
            <div className="text-[11px] truncate font-medium" aria-hidden>{ev.time ? `${ev.time} • ` : ''}{ev.title}</div>
          </div>
        ))}
        {eventsForDay && eventsForDay.length > 3 && <div className="text-[10px] text-slate-400">+{eventsForDay.length - 3} more</div>}
      </div>

      {/* Mini markers in top-right */}
      <div className="absolute top-1 right-1 flex gap-0.5">
        {isHoliday && <span className="text-[10px]">🔴</span>}
        {birthdays?.length > 0 && <span className="text-[10px]"></span>}
    {/* {birthdays?.length > 0 && <span className="text-[10px]">🎉</span>} */}

      </div>
    </button>
  );
};



// Month header
const MonthHeader = ({ currentDate, onPrev, onNext, onToday, onJumpTo }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <button onClick={onPrev} className="p-2 rounded-md bg-slate-100 hover:bg-slate-200 transition">‹</button>
      <button onClick={onNext} className="p-2 rounded-md bg-slate-100 hover:bg-slate-200 transition">›</button>
      <div className="ml-3 text-sm">
        <div className="text-xs text-slate-500">{format(currentDate, 'yyyy')}</div>
        <div className="text-lg font-bold text-slate-800">{format(currentDate, 'MMMM')}</div>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <button onClick={onToday} className="px-3 py-1 text-sm bg-sky-600 text-white rounded shadow hover:opacity-95">Today</button>
      <select
        aria-label="Jump to month"
        onChange={(e) => onJumpTo(e.target.value)}
        defaultValue=""
        className="text-sm p-2 rounded border border-slate-200 bg-white"
      >
        <option value="">Select Month</option>
        {Array.from({ length: 12 }).map((_, i) => {
          const d = new Date(getYear(currentDate), i, 1);
          return <option key={i} value={d.toISOString()}>{format(d, 'MMMM')}</option>;
        })}
      </select>
    </div>
  </div>
);

// Legend
const Legend = ({ colors }) => (
  <div className="flex items-center gap-3 text-[12px] text-slate-600">
    {colors.map(c => (
      <div key={c.label} className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
        <span>{c.label}</span>
      </div>
    ))}
  </div>
);

const BestCalendar = ({ events = {}, holidays = [], initialDate = new Date() }) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialDate));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [openDay, setOpenDay] = useState(null);
  const [employees, setEmployees] = useState([]);

  // Fetch employees for birthdays
  useEffect(() => {
    fetch(`${BASE_URL}/employeesSide/employees.php`)
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(err => console.error(err));
  }, []);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days = [];
    let date = start;
    while (date <= end) {
      days.push(date);
      date = addDays(date, 1);
    }
    return days;
  }, [currentMonth]);

  const handlePrev = () => setCurrentMonth(m => subMonths(m, 1));
  const handleNext = () => setCurrentMonth(m => addMonths(m, 1));
  const handleToday = () => { setCurrentMonth(startOfMonth(new Date())); setSelectedDate(new Date()); };
  const handleJumpTo = (iso) => { if (!iso) return; setCurrentMonth(startOfMonth(new Date(iso))); };

  const onDayClick = (date) => {
    setSelectedDate(date);
    const key = format(date, 'yyyy-MM-dd');
    setOpenDay(openDay === key ? null : key); // toggle popup only
  };

  return (
    <div className="w-full px-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <MonthHeader currentDate={currentMonth} onPrev={handlePrev} onNext={handleNext} onToday={handleToday} onJumpTo={handleJumpTo} />
          <div className="mt-3 md:mt-0 flex items-center justify-end gap-4">
            <Legend colors={[
              { label: 'Meetings', color: '#06b6d4' },
              { label: 'Personal', color: '#f97316' },
              { label: 'Deadline', color: '#ef4444' },
            ]} />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3 px-5 pb-5">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-xs font-semibold text-slate-500 text-center">{d}</div>
          ))}

          {weeks.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const eventsForDay = events[key] || [];
            const holiday = holidays.find(h => {
              const hDate = h.holiday_date;
              if (h.is_recurring) {
                const hd = parseISO(hDate);
                return hd.getDate() === day.getDate() && hd.getMonth() === day.getMonth();
              }
              return key === hDate;
            });

            const birthdays = employees.filter(emp => {
              if (!emp.date_of_birth) return false;
              const dob = parseISO(emp.date_of_birth);
              return dob.getDate() === day.getDate() && dob.getMonth() === day.getMonth();
            });

            return (
              <div key={key} className="relative">
                <div className="p-1">
                  <DayCell
                    date={day}
                    monthStart={currentMonth}
                    selectedDate={selectedDate}
                    eventsForDay={eventsForDay}
                    isHoliday={!!holiday}
                    birthdays={birthdays}
                    onDayClick={onDayClick}
                  />
                  {holiday && <div className="absolute top-1 left-1 text-[10px] text-red-700 font-semibold"></div>}
                </div>

                <AnimatePresence>
                  {openDay === key && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute z-50 left-0 top-full mt-2 min-w-[15rem] md:min-w-[20rem] lg:min-w-[32rem] bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-slate-800">{format(day, 'PPP')}</div>
                        <button onClick={() => setOpenDay(null)} className="text-slate-400">✕</button>
                      </div>

                      {holiday && <div className="mb-2 text-red-700 font-medium">Holiday: {holiday.name}</div>}

                      {birthdays.length > 0 && (
                        <div className="mb-2 text-sky-600 font-medium flex flex-col gap-1">
                          {birthdays.map(b => <div key={b.employee_id}>🎂 {b.first_name} {b.last_name}</div>)} {/* full name shown in popup */}
                        </div>
                      )}

                      {eventsForDay.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {eventsForDay.map(ev => (
                            <div key={ev.id} className="p-2 rounded border border-slate-100 flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: ev.color || '#06b6d4' }} />
                              <div className="flex-1">
                                <div className="text-[13px] font-semibold text-slate-800">{ev.title}</div>
                                <div className="text-[12px] text-slate-500">{ev.time || 'All day'}</div>
                                {ev.description && <div className="mt-1 text-[12px] text-slate-500">{ev.description}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400">No events</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BestCalendar;
