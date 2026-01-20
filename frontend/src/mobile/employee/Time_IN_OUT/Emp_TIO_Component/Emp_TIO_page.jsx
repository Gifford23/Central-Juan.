// TimeInOut — supports is_shift_split control and full-shift behaviour
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import useAttendance from '../Emp_TIO_HOOKS/useTIOAttendanceHooks';
import { createAttendance, updateAttendance } from '../Emp_TimeInOutAPI/Emp_TIO_Api';
import BASE_URL from '../../../../../backend/server/config';
import '../../../../../Styles/globals.css';
import { Clock as LucideClock, Calendar as LucideCalendar, Tag as LucideTag } from 'lucide-react';

const TimeInOut = ({ employeeId: propEmployeeId, employeeName: propEmployeeName }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const { employeeId, employeeName } = propEmployeeId && propEmployeeName
    ? { employeeId: propEmployeeId, employeeName: propEmployeeName }
    : location.state || {};

  const lastSyncedIso = typeof window !== 'undefined' ? localStorage.getItem('ph_last_synced') : null;
  const initialSelectedDate = lastSyncedIso
    ? new Date(lastSyncedIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const {
    attendanceId,
    timeInMorning,
    timeOutMorning,
    timeInAfternoon,
    timeOutAfternoon,
    setTimeInMorning,
    setTimeOutMorning,
    setTimeInAfternoon,
    setTimeOutAfternoon,
  } = useAttendance(employeeId, selectedDate);

  // PH time
  const [phNow, setPhNow] = useState(null);
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [amPmMode, setAmPmMode] = useState('AM');
  const [isLoading, setIsLoading] = useState(false);

  // schedule state
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [workTime, setWorkTime] = useState(null);
  const [scheduleFound, setScheduleFound] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [defaultUsed, setDefaultUsed] = useState(false);

  // refs/helpers
  const offsetRef = useRef(0);
  const mountedRef = useRef(true);
  const syncInFlightRef = useRef(false);
  const RESYNC_INTERVAL_MS = 10 * 60 * 1000;
  const DEVICE_DIFF_THRESHOLD_MIN = 2;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPHTimeFromAPI = async () => {
    try {
      const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Manila');
      if (!res.ok) throw new Error(`timeapi.io status ${res.status}`);
      const data = await res.json();
      return new Date(data.dateTime);
    } catch {
      const res2 = await fetch('https://worldtimeapi.org/api/timezone/Asia/Manila');
      if (!res2.ok) throw new Error('fallback worldtimeapi failed');
      const data2 = await res2.json();
      return new Date(data2.datetime);
    }
  };

  const syncWithServer = async (saveToLocal = true) => {
    if (syncInFlightRef.current) return !!phNow;
    syncInFlightRef.current = true;
    try {
      const serverNow = await fetchPHTimeFromAPI();
      const offset = serverNow.getTime() - Date.now();
      offsetRef.current = offset;
      if (saveToLocal && typeof window !== 'undefined') {
        try {
          localStorage.setItem('ph_offset', String(offset));
          localStorage.setItem('ph_last_synced', serverNow.toISOString());
        } catch (e) {}
      }
      if (!mountedRef.current) return true;
      const corrected = new Date(Date.now() + offsetRef.current);
      setPhNow(corrected);
      setCurrentTime(corrected.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Manila' }));
      setCurrentDate(corrected.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' }));
      setSelectedDate(corrected.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));

      const hour = corrected.getHours();
      const minute = corrected.getMinutes();
      if (timeInAfternoon || timeOutAfternoon || (hour === 12 && minute >= 30) || hour > 12) setAmPmMode('PM');
      else setAmPmMode('AM');

      return true;
    } catch (err) {
      return false;
    } finally {
      syncInFlightRef.current = false;
    }
  };

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('ph_offset') : null;
      if (stored !== null) {
        const parsed = Number(stored);
        if (!Number.isNaN(parsed)) {
          offsetRef.current = parsed;
          const corrected = new Date(Date.now() + offsetRef.current);
          setPhNow(corrected);
          setCurrentTime(corrected.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Manila' })); 
          setCurrentDate(corrected.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })); 
          setSelectedDate(corrected.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
          const hour = corrected.getHours();
          const minute = corrected.getMinutes();
          if (timeInAfternoon || timeOutAfternoon || (hour === 12 && minute >= 30) || hour > 12) setAmPmMode('PM');
          else setAmPmMode('AM');
        }
      }
    } catch (e) {}

    const tick = setInterval(() => {
      const corrected = new Date(Date.now() + offsetRef.current);
      setPhNow(corrected);
      setCurrentTime(corrected.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Manila' }));
      setCurrentDate(corrected.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' }));
      setSelectedDate(corrected.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
      const hour = corrected.getHours();
      const minute = corrected.getMinutes();
      if (timeInAfternoon || timeOutAfternoon || (hour === 12 && minute >= 30) || hour > 12) setAmPmMode('PM');
      else setAmPmMode('AM');
    }, 1000);

    syncWithServer(true).catch(() => {});
    const resync = setInterval(() => {
      syncWithServer(true);
    }, RESYNC_INTERVAL_MS);

    return () => {
      clearInterval(tick);
      clearInterval(resync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeInMorning, timeOutMorning, timeInAfternoon, timeOutAfternoon]);

  // ---------- fetch employee schedule ----------
  useEffect(() => {
    if (!employeeId || !selectedDate) {
      setSchedule(null);
      setWorkTime(null);
      setScheduleFound(false);
      setScheduleError(null);
      setDefaultUsed(false);
      return;
    }

    const ac = new AbortController();

    const fetchDefaultWorkTime = async () => {
      try {
        const url = `${BASE_URL}/schedule-manager/get_shifts.php`;
        const res = await fetch(url, { signal: ac.signal });
        const json = await res.json();
        const list = json?.work_times || json?.work_time || [];
        if (Array.isArray(list) && list.length) {
          const found = list.find((w) => w.is_default === 1 || w.is_default === '1' || w.is_default === true);
          if (found) {
            setWorkTime({ ...found, allowed_windows: found.allowed_windows || null, breaks: found.breaks || [] });
            setSchedule(null);
            setScheduleFound(false);
            setDefaultUsed(true);
            return true;
          }
        }
      } catch (err) {
        // ignore abort
      }
      return false;
    };

    // helper: fetch breaks for a work_time_id (same as before)
    const fetchBreaksByWorkTimeId = async (wtId, signal) => {
      try {
        if (!wtId) return { success: false, breaks: [] };
        const qs = new URLSearchParams({ work_time_id: String(wtId) });
        const url = `${BASE_URL}/schedule-manager/get_breaks_by_work_time.php?${qs.toString()}`;
        console.log('[breaks] requesting breaks for work_time_id=', wtId, 'url=', url);
        const res = await fetch(url, { signal });
        console.log('[breaks] HTTP status', res.status, 'ok=', res.ok);
        if (!res.ok) {
          const text = await res.text().catch(()=>null);
          console.warn('[breaks] non-ok response', res.status, text);
          return { success: false, message: `HTTP ${res.status}` };
        }
        const json = await res.json();
        console.log('[breaks] response json for work_time_id=', wtId, json);
        if (json && json.success) {
          console.log(`[breaks] fetched ${Array.isArray(json.breaks) ? json.breaks.length : 0} break(s) for work_time_id=${wtId}`);
          if (json.debug) console.debug('[breaks] debug object:', json.debug);
          return { success: true, breaks: json.breaks || [], debug: json.debug || null };
        }
        console.warn('[breaks] endpoint returned success=false or no data', json);
        if (json?.debug) console.debug('[breaks] debug payload:', json.debug);
        return { success: false, message: json?.error || json?.message || 'no data', debug: json?.debug || null };
      } catch (err) {
        if (err && err.name === 'AbortError') {
          console.log('[breaks] fetch aborted for work_time_id', wtId);
          return { success: false, message: 'aborted' };
        }
        console.error('[breaks] fetch error for work_time_id', wtId, err);
        return { success: false, message: err?.message || String(err) };
      }
    };

const breakInEndExtended = (b) => {
  const end = breakInEnd(b);
  return end ? addMinutesToTimeStr(end, 60) : null;
};

const inBreakInWindowExtended = (phTime, b) => {
  if (!b) return false;
  // inside normal break-in window
  if (inBreakInWindow(phTime, b)) return true;
  // or inside 1-hour extension after break_in_end
  const end = breakInEnd(b);
  const endExt = breakInEndExtended(b);
  if (end && endExt && isWithinWindow(phTime, end, endExt)) return true;
  return false;
};

    const fetchSchedule = async () => {
      setScheduleLoading(true);
      setScheduleError(null);
      setDefaultUsed(false);
      try {
        const url = `${BASE_URL}/schedule-manager/get_employee_shift_window.php?employee_id=${encodeURIComponent(employeeId)}&date=${encodeURIComponent(selectedDate)}`;
        const res = await fetch(url, { signal: ac.signal });
        const json = await res.json();

        console.log('get_employee_shift_window response', { url, payload: json, employeeId, selectedDate });

        if (json && json.success) {
          setSchedule(json.schedule || null);
          const sourceWork = json.work_time || (json.default_used && json.default_work_time ? json.default_work_time : null) || {};
          const combinedWork = { ...sourceWork, allowed_windows: json.allowed_windows || null, breaks: json.breaks || [] };

          console.log('[breaks] breaks present on get_employee_shift_window:', Array.isArray(json.breaks) ? json.breaks.length : 0, 'items:', json.breaks || null);

          setWorkTime(combinedWork);
          setScheduleFound(!!json.found);
          setDefaultUsed(!!json.default_used);

          // ensure breaks are filled by calling get_breaks_by_work_time.php if needed
          const wtId = (combinedWork && (combinedWork.id || combinedWork.work_time_id)) || (json?.schedule && json.schedule.work_time_id) || null;
          const numericWtId = wtId ? Number(wtId) : null;

          if (numericWtId) {
            console.log('[breaks] will fetch breaks for numericWtId=', numericWtId);
            const brResp = await fetchBreaksByWorkTimeId(numericWtId, ac.signal);
            if (brResp.success) {
              console.log('[breaks] merging fetched breaks into workTime (count=', (brResp.breaks||[]).length, ')');
              setWorkTime(prev => {
                const base = prev || combinedWork || {};
                const newBreaks = (brResp.breaks && Array.isArray(brResp.breaks) && brResp.breaks.length) ? brResp.breaks : (base.breaks || []);
                console.log('[breaks] setWorkTime -> breaks length', newBreaks.length);
                return { ...base, breaks: newBreaks };
              });
            } else {
              console.warn('[breaks] fetchBreaksByWorkTimeId failed for', numericWtId, 'message:', brResp.message || null);
              if (brResp.debug) console.debug('[breaks] debug info:', brResp.debug);
            }
          } else {
            console.warn('[breaks] no numeric work_time_id available to fetch breaks:', wtId);
          }

        } else {
          if (json && json.default_used && json.default_work_time) {
            setWorkTime({ ...(json.default_work_time || {}), allowed_windows: json.allowed_windows || null, breaks: json.breaks || [] });
            setSchedule(null);
            setScheduleFound(false);
            setDefaultUsed(true);
            console.warn('Using default work_time provided by backend.');
          } else {
            const gotDefault = await fetchDefaultWorkTime();
            if (!gotDefault) {
              setSchedule(null);
              setWorkTime(null);
              setScheduleFound(false);
              setDefaultUsed(false);
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setScheduleError(err.message || String(err));
          console.error('fetchSchedule error', err);
        } else {
          console.log('fetchSchedule aborted');
        }
      } finally {
        setScheduleLoading(false);
      }
    };

    fetchSchedule();
    return () => ac.abort();
  }, [employeeId, selectedDate]);

  // Helpers
  const formatTime = (date) =>
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

  const to12HourFormat = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    const base = phNow ? new Date(phNow) : new Date(Date.now() + offsetRef.current);
    base.setHours(hours, minutes, seconds, 0);
    return base.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
  };

  const formatDateFriendly = (isoDate) => {
    if (!isoDate) return '—';
    try {
      const d = new Date(isoDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
    } catch (e) {
      return isoDate;
    }
  };

  const parseDays = (daysRaw) => {
    if (!daysRaw) return [];
    if (Array.isArray(daysRaw)) return daysRaw;
    return daysRaw.split(',').map(s => s.trim()).filter(Boolean);
  };

  const RecurrenceBadge = ({ rec }) => {
    if (!rec) return null;
    const label = rec === 'none' ? 'One-off' : rec.charAt(0).toUpperCase() + rec.slice(1);
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-blue-50 text-blue-800">
        <LucideTag className="w-3 h-3 mr-1" /> {label}
      </span>
    );
  };

  const DaysChips = ({ days }) => {
    const list = parseDays(days);
    if (!list.length) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {list.map((d) => (
          <div key={d} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">{d}</div>
        ))}
      </div>
    );
  };

  // --- Window helpers (use allowed_windows from backend) ---
  const getDateForTimeStr = (baseDate, timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0);
    const d = new Date(baseDate); // clone
    d.setHours(parts[0], parts[1], parts[2] || 0, 0);
    return d;
  };

  const addMinutesToTimeStr = (timeStr, minutesToAdd) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0);
    const dt = new Date();
    dt.setHours(parts[0], parts[1], parts[2] || 0, 0);
    dt.setMinutes(dt.getMinutes() + minutesToAdd);
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    const ss = String(dt.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const isWithinWindow = (phTime, startStr, endStr) => {
    if (!phTime || !startStr || !endStr) return false;
    const startD = getDateForTimeStr(phTime, startStr);
    const endD = getDateForTimeStr(phTime, endStr);
    if (!startD || !endD) return false;
    return phTime.getTime() >= startD.getTime() && phTime.getTime() <= endD.getTime();
  };

  const friendlyWindowLabel = (startStr, endStr) => {
    if (!startStr || !endStr) return '—';
    const base = phNow || new Date(Date.now() + offsetRef.current);
    const s = getDateForTimeStr(base, startStr);
    const e = getDateForTimeStr(base, endStr);
    return `${s ? s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' }) : '—'} - ${e ? e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' }) : '—'}`;
  };

  // --- Break helpers (front-end)
  const getBreaks = () => (workTime && workTime.breaks && Array.isArray(workTime.breaks)) ? workTime.breaks : [];

  // Break window helpers: prefer computed_* from backend, else derive
  const breakOutStart = (b) => b.computed_valid_break_out_start || b.valid_break_out_start || b.break_start;
  const breakOutEnd = (b) => b.computed_valid_break_out_end || b.valid_break_out_end || addMinutesToTimeStr(b.break_start, 30);
  const breakInStart = (b) => b.computed_valid_break_in_start || b.valid_break_in_start || addMinutesToTimeStr(b.break_start, 30);
  const breakInEnd = (b) => b.computed_valid_break_in_end || b.valid_break_in_end || b.break_end;

  // check if ANY break is marked as shift split
  const hasShiftSplit = () => getBreaks().some(x => Number(x.is_shift_split) === 1);

  // find active shift-split break that matches current phTime (prefers first match)
  const findActiveSplitBreak = (phTime) => {
    const list = getBreaks().filter(x => Number(x.is_shift_split) === 1);
    for (const b of list) {
      if (isWithinWindow(phTime, breakOutStart(b), breakOutEnd(b)) || isWithinWindow(phTime, breakInStart(b), breakInEnd(b))) {
        return b;
      }
    }
    return null;
  };

  const inBreakOutWindow = (phTime, b) => {
    if (!b) return false;
    return isWithinWindow(phTime, breakOutStart(b), breakOutEnd(b));
  };
  const inBreakInWindow = (phTime, b) => {
    if (!b) return false;
    return isWithinWindow(phTime, breakInStart(b), breakInEnd(b));
  };

  // 1-hour cutoff helper: returns true if phNow > (timeStr + minutes)
  const isPastLateCutoff = (timeStr, minutes = 60) => {
    if (!timeStr || !phNow) return false;
    const cutoff = getDateForTimeStr(phNow, timeStr);
    if (!cutoff) return false;
    cutoff.setMinutes(cutoff.getMinutes() + minutes);
    return phNow.getTime() > cutoff.getTime();
  };

  // UI label helpers updated to consider hasShiftSplit (full-shift vs split-shift)
  const computeButtonLabel = () => {
    const phTimeNow = phNow || new Date(Date.now() + offsetRef.current);
    const activeSplitCurrent = findActiveSplitBreak(phTimeNow);
    const split = hasShiftSplit();

    if (!split) {
      // full-shift: single clock-in and single clock-out (AM used as canonical)
      if (!timeInMorning) return 'Clock In';
      if (timeInMorning && !timeOutMorning) return 'Clock Out';
      return 'Done';
    }

    // split-shift behaviour (existing)
    if (amPmMode === 'AM') {
      if (!timeInMorning) {
        if (activeSplitCurrent && inBreakInWindow(phTimeNow, activeSplitCurrent)) return `Clock In (post-break)`;
        return `Clock In`;
      }
      if (timeInMorning && !timeOutMorning) {
        if (activeSplitCurrent && inBreakOutWindow(phTimeNow, activeSplitCurrent)) return `Clock Out for Break (${activeSplitCurrent.break_name || 'Break'})`;
        return `Clock Out`;
      }
      return `Next PM`;
    }

    // PM mode
    if (!timeInAfternoon) return `Clock In`;
    if (timeInAfternoon && !timeOutAfternoon) return `Clock Out`;
    return `Done`;
  };

  const computeButtonSubLabel = () => {
    const phTimeNow = phNow || new Date(Date.now() + offsetRef.current);
    const activeSplitCurrent = findActiveSplitBreak(phTimeNow);
    const split = hasShiftSplit();

    if (!split) {
      if (!timeInMorning) {
        return ''; // normal
      }
      if (timeInMorning && !timeOutMorning) {
        return `This will record your final clock-out for the day.`; 
      }
      return '';
    }

    if (amPmMode === 'AM') {
      if (!timeInMorning) {
        if (activeSplitCurrent && inBreakInWindow(phTimeNow, activeSplitCurrent)) return `You are in the break-in window — clocking in will record start of AM after break.`;
        return '';
      }
      if (timeInMorning && !timeOutMorning) {
        if (activeSplitCurrent && inBreakOutWindow(phTimeNow, activeSplitCurrent)) return `You are in the break-out window — this will record a break start (time out AM).`;
        return '';
      }
      return '';
    }

    return '';
  };

  // Confirm + save wrapper (unchanged)
  const showSwal = async (promiseFn, loadingMsg, successMsg) => {
    setIsLoading(true);
    Swal.fire({
      title: 'Please wait...',
      text: loadingMsg,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    await new Promise((res) => setTimeout(res, 800));
    try {
      const response = await promiseFn();
      Swal.close();
      if (response?.data?.success) {
        Swal.fire('Success', successMsg, 'success');
      } else {
        Swal.fire('Failed', response?.data?.message || 'Unexpected error.', 'error');
      }
    } catch (err) {
      Swal.close();
      Swal.fire('Error', err?.message || 'Something went wrong.', 'error');
    }
    setIsLoading(false);
  };

  const sendLateRequest = () => {
    const win = workTime?.allowed_windows || {};
    const canonicalStart = workTime?.start_time || null;
    const modalStart = canonicalStart || workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || null;
    const modalComputedEnd = modalStart ? addMinutesToTimeStr(modalStart, 60) : null;

    const usingStartType = canonicalStart ? 'start_time' : (workTime?.valid_in_start ? 'valid_in_start' : (workTime?.allowed_windows?.valid_in_start ? 'allowed_windows.valid_in_start' : 'none'));

    const amLabel = usingStartType === 'start_time' ? 'Time In AM (start_time)' :
                    usingStartType === 'valid_in_start' ? 'Time In AM (valid_in_start fallback)' :
                    usingStartType === 'allowed_windows.valid_in_start' ? 'Time In AM (window fallback)' :
                    'Time In AM';

    const amIn = modalStart ? friendlyWindowLabel(modalStart, modalComputedEnd) : '—';
    const amOut = friendlyWindowLabel(win.valid_out_start, win.valid_out_end);
    const pmIn = friendlyWindowLabel(win.valid_in_start, win.valid_in_end);
    const pmOut = friendlyWindowLabel(win.valid_out_start, win.valid_out_end);

    const br = getBreaks();
    const breaksHtml = br.length ? `<br/><strong>Breaks:</strong><br/>${br.map(b => `${b.break_name}: ${friendlyWindowLabel(breakOutStart(b), breakOutEnd(b))} (out) / ${friendlyWindowLabel(breakInStart(b), breakInEnd(b))} (in)`).join('<br/>')}` : '';

    Swal.fire({
      icon: 'warning',
      title: 'Outside allowed time',
      html: `
        <p>You are outside the allowed time window.</p>
        <br />
        <strong>${amLabel}:</strong> ${amIn}<br/>
        <strong>Time Out AM:</strong> ${amOut}<br/>
        <strong>Time In PM:</strong> ${pmIn}<br/>
        <strong>Time Out PM:</strong> ${pmOut}<br/>
        ${breaksHtml}
        <br />
        Do you want to send a late request?
      `,
      showCancelButton: true,
      confirmButtonText: 'Adj. Request',
    }).then((res) => {
      if (res.isConfirmed) {
        navigate('/employee/late-request', { state: { employeeId, employeeName } });
      }
    });
  };

  const confirmAndSetTime = (label, setTimeCallback, timeKey, phTimeArg) => {
    const useTime = phTimeArg || phNow;
    if (!useTime) {
      Swal.fire('Error', 'Unable to determine Philippine time. Please check your connection and try again.', 'error');
      return;
    }
    const formattedTime = formatTime(useTime);

    Swal.fire({
      icon: 'question',
      title: `${label}?`,
      text: attendanceId ? 'Attendance already exists. Do you want to update it?' : 'Do you want to submit this record?',
      showCancelButton: true,
      confirmButtonText: attendanceId ? 'Update' : 'Submit',
    }).then((res) => {
      if (res.isConfirmed) {
        setTimeCallback(formattedTime);
        const formData = {
          attendance_id: attendanceId,
          attendance_date: useTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
          employee_id: employeeId,
          employee_name: employeeName,
          time_in_morning: timeKey === 'time_in_morning' ? formattedTime : timeInMorning,
          time_out_morning: timeKey === 'time_out_morning' ? formattedTime : timeOutMorning,
          time_in_afternoon: timeKey === 'time_in_afternoon' ? formattedTime : timeInAfternoon,
          time_out_afternoon: timeKey === 'time_out_afternoon' ? formattedTime : timeOutAfternoon,
        };

        const apiCall = attendanceId
          ? () => updateAttendance(formData)
          : () => createAttendance(formData);

        showSwal(apiCall, attendanceId ? 'Updating attendance...' : 'Submitting attendance...', 'Attendance saved successfully!');
      }
    });
  };

  // ---------- Main click handler (updated to respect is_shift_split) ----------
  const handleClick = async () => {
    if (!phNow) {
      const ok = await syncWithServer(true);
      if (!ok && !phNow) {
        Swal.fire('Error', 'Unable to determine Philippine time. Please check your connection and try again.', 'error');
        return;
      }
    }

    const phTimeNow = phNow || new Date(Date.now() + offsetRef.current);
    const deviceNow = new Date();
    const diffMinutes = Math.abs((deviceNow.getTime() - phTimeNow.getTime()) / 60000);
    const deviceDateEnCA = deviceNow.toLocaleDateString('en-CA');
    const phDateEnCA = phTimeNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    if (diffMinutes > DEVICE_DIFF_THRESHOLD_MIN || deviceDateEnCA !== phDateEnCA) {
      const formatReadable = (date, usePHZone = false) =>
        date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: usePHZone ? 'Asia/Manila' : undefined,
        });

      const deviceReadable = formatReadable(deviceNow, false);
      const phReadable = formatReadable(phTimeNow, true);

      const result = await Swal.fire({
        icon: 'warning',
        title: 'Device time mismatch',
        html: `
          <p>Your device time/date does not match the official Philippine time.</p>
          <p><strong>Device Time:</strong> ${deviceReadable}</p>
          <p><strong>PH Time:</strong> ${phReadable}</p>
          <br/>
          <p>Please correct your device time/date or press <strong>Sync PH Time</strong> to refresh PH time.</p>
        `,
        showCancelButton: true,
        confirmButtonText: 'Sync PH Time',
        cancelButtonText: 'Cancel',
      });

      if (result.isConfirmed) {
        const ok = await syncWithServer(true);
        if (!ok) {
          Swal.fire('Error', 'Unable to sync Philippine time. Please check your connection.', 'error');
        } else {
          return handleClick();
        }
      }
      return;
    }

    const todayPhDate = phTimeNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const isTodayLocal = selectedDate === todayPhDate;
    if (!isTodayLocal) {
      Swal.fire('View Only', 'You can only edit attendance for today.', 'info');
      return;
    }

    const win = workTime?.allowed_windows || {};
    const split = hasShiftSplit();
    const activeSplit = findActiveSplitBreak(phTimeNow);

    console.log('[click] split?', split, 'activeSplit:', activeSplit);

    // FULL-SHIFT (no split break) behaviour: single clock-in and single clock-out
    if (!split) {
      // canonicalStart and windows
      const canonicalStart = workTime?.start_time || null;
      // const windowInStart = workTime?.valid_in_start || win.valid_in_start || canonicalStart || null;
      const windowInStart = (win && (win.valid_in_start || null)) || workTime?.valid_in_start || canonicalStart || null;
      // const windowInEnd = workTime?.valid_in_end || win.valid_in_end || (windowInStart ? addMinutesToTimeStr(windowInStart, 60) : null);
      const windowInEnd = (win && (win.valid_in_end || null)) || workTime?.valid_in_end || (windowInStart ? addMinutesToTimeStr(windowInStart, 60) : null);
      const windowOutStart = workTime?.valid_out_start || win.valid_out_start || null;
      const windowOutEnd = workTime?.valid_out_end || win.valid_out_end || null;

      // 1) if not clocked in yet -> clock-in (subject to allowed_in window and late cutoff)
      if (!timeInMorning) {
        // allow immediate clock-in if inside allowed window
        if (windowInStart && windowInEnd && isWithinWindow(phTimeNow, windowInStart, windowInEnd)) {
          confirmAndSetTime('Clock in', setTimeInMorning, 'time_in_morning', phTimeNow);
          return;
        }

        // if late but less than 60 min -> prompt adjustment
        const startBase = canonicalStart || windowInStart;
        if (startBase && isPastLateCutoff(startBase, 60)) {
          // more than 60 min late -> offer late request
          const startDTModal = startBase ? getDateForTimeStr(phTimeNow, startBase) : null;
          const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;
          Swal.fire({
            icon: 'warning',
            title: 'Outside allowed time',
            html: `<p>Your clock-in is outside the allowed window.</p>
                   ${lateDeltaMinutes !== null ? `<p>You are ${lateDeltaMinutes} minute(s) late.</p>` : ''}
                   <p>Do you want to send a late/adjustment request instead?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Send Adjustment Request'
          }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
          return;
        }

        // if not in window but within 60 minutes late -> offer to send adjustment
        const startDTModal = startBase ? getDateForTimeStr(phTimeNow, startBase) : null;
        const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;
        if (lateDeltaMinutes !== null && lateDeltaMinutes > 0 && lateDeltaMinutes < 60) {
          Swal.fire({
            icon: 'warning',
            title: 'Outside allowed time',
            html: `<p>Your clock-in is outside the allowed window.</p>
                   <p>You are ${lateDeltaMinutes} minute(s) late. Do you want to send a late/adjustment request instead?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Send Adjustment Request',
            cancelButtonText: 'Cancel'
          }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
          return;
        }

        // fallback: use sendLateRequest UI
        sendLateRequest();
        return;
      }

      // 2) already clocked in but not clocked out -> final clock-out (use valid_out window)
      if (!timeOutMorning) {
        if (windowOutStart && windowOutEnd && isWithinWindow(phTimeNow, windowOutStart, windowOutEnd)) {
          confirmAndSetTime('Clock out', setTimeOutMorning, 'time_out_morning', phTimeNow);
          return;
        }

        // --- ALLOW EARLY OUT: if current time is before scheduled end, ask user to confirm early out ---
        const scheduledOutStr = workTime?.end_time || windowOutEnd || windowOutStart || null;
        if (scheduledOutStr) {
          const scheduledOutDate = getDateForTimeStr(phTimeNow, scheduledOutStr);
          if (scheduledOutDate && phTimeNow.getTime() < scheduledOutDate.getTime()) {
            Swal.fire({
              icon: 'warning',
              title: 'Early out',
              html: `<p>You are attempting to clock out before the scheduled end of your shift.</p>
                     <p>Scheduled end: <strong>${scheduledOutDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })}</strong></p>
                     <p>Do you want to proceed and record an early clock-out?</p>`,
              showCancelButton: true,
              confirmButtonText: 'Clock Out Early',
              cancelButtonText: 'Cancel'
            }).then((res) => {
              if (res.isConfirmed) {
                confirmAndSetTime('Clock out (early)', setTimeOutMorning, 'time_out_morning', phTimeNow);
              }
            });
            return;
          }
        }

        const allowedText = windowOutStart && windowOutEnd ? friendlyWindowLabel(windowOutStart, windowOutEnd) : '—';
        Swal.fire({
          icon: 'warning',
          title: 'Outside allowed time',
          html: `<p>Your clock-out is outside the allowed window.</p>
                 <p><strong>Allowed Clock-out:</strong> ${allowedText}</p>
                 <p>Send a late/adjustment request?</p>`,
          showCancelButton: true,
          confirmButtonText: 'Send Adjustment Request'
        }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
        return;
      }

      // already clocked in/out
      Swal.fire('Info', 'You have already clocked in and out for today.', 'info');
      return;
    }

    // SPLIT-SHIFT behaviour (existing behaviour but tightened to use break is_shift_split)
    // AM mode
    if (amPmMode === 'AM') {
      // 1) if user hasn't clocked IN morning
      if (!timeInMorning) {
        const canonicalStart = workTime?.start_time || null;
        // const shiftStartForChecks = workTime?.start_time || workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || null;
        const shiftStartForChecks = workTime?.start_time || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || workTime?.valid_in_start || null;

        const computedAMEndForChecks = shiftStartForChecks ? addMinutesToTimeStr(shiftStartForChecks, 60) : null;
        const modalStart = canonicalStart || workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || null;
        const modalComputedEnd = modalStart ? addMinutesToTimeStr(modalStart, 60) : null;
        const usingStartType = canonicalStart ? 'start_time' : (workTime?.valid_in_start ? 'valid_in_start' : (workTime?.allowed_windows?.valid_in_start ? 'allowed_windows.valid_in_start' : 'none'));
        const amLabel = usingStartType === 'start_time' ? 'Allowed Clock-in (start_time)' :
                        usingStartType === 'valid_in_start' ? 'Allowed Clock-in (valid_in_start fallback)' :
                        usingStartType === 'allowed_windows.valid_in_start' ? 'Allowed Clock-in (window fallback)' :
                        'Allowed Clock-in';

        // allow immediate clock-in if inside post-break window (employee returning after break)
        if (activeSplit && inBreakInWindowExtended(phTimeNow, activeSplit)) {
          console.log('[break] in break-in window -> post-break clock-in permitted');
          confirmAndSetTime(`Clock in for AM (post-break)`, setTimeInMorning, 'time_in_morning', phTimeNow);
          return;
        }

        // cutoff >60 minutes after canonical start
        const cutoffBase = canonicalStart || shiftStartForChecks;
        if (cutoffBase && isPastLateCutoff(cutoffBase, 60)) {
          const lateBase = canonicalStart || modalStart || shiftStartForChecks;
          const startDTModal = lateBase ? getDateForTimeStr(phTimeNow, lateBase) : null;
          const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;
          Swal.fire({
            icon: 'warning',
            title: 'Outside allowed time',
            html: `<p>Your clock-in is outside the allowed window.</p>
                   ${lateDeltaMinutes !== null ? `<p>You are ${lateDeltaMinutes} minute(s) late.</p>` : ''}
                   <p><strong>${amLabel}:</strong> ${canonicalStart ? friendlyWindowLabel(canonicalStart, addMinutesToTimeStr(canonicalStart, 60)) : (modalStart ? friendlyWindowLabel(modalStart, modalComputedEnd) : '—')}</p>
                   <p>Do you want to send a late/adjustment request instead?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Send Adjustment Request',
            cancelButtonText: 'Cancel'
          }).then((res) => {
            if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } });
          });
          return;
        }

        // if currently inside a break-out window and break is shift-split, suggest clocking out for break instead
        if (activeSplit && inBreakOutWindow(phTimeNow, activeSplit)) {
          if (!timeOutMorning) {
            confirmAndSetTime(`Clock out for break (${activeSplit.break_name})`, setTimeOutMorning, 'time_out_morning', phTimeNow);
            return;
          }
        }

        // Normal AM clock-in window (allowed_windows/shiftStartForChecks)
        if ((workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start)) || shiftStartForChecks) {
          const windowStartForCheck = (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || workTime?.valid_in_start || shiftStartForChecks;
          if (computedAMEndForChecks && isWithinWindow(phTimeNow, windowStartForCheck, computedAMEndForChecks)) {
            confirmAndSetTime('Clock in for AM', setTimeInMorning, 'time_in_morning', phTimeNow);
            return;
          } else {
            // late behavior within 60 minutes
            const lateBase = canonicalStart || modalStart || windowStartForCheck;
            const startDTModal = lateBase ? getDateForTimeStr(phTimeNow, lateBase) : null;
            const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;
            if (lateDeltaMinutes > 0 && lateDeltaMinutes < 60) {
              Swal.fire({
                icon: 'warning',
                title: 'Outside allowed time',
                html: `<p>Your clock-in is outside the allowed window.</p>
                       <p><strong>${amLabel}:</strong> ${canonicalStart ? friendlyWindowLabel(canonicalStart, addMinutesToTimeStr(canonicalStart, 60)) : (modalStart ? friendlyWindowLabel(modalStart, modalComputedEnd) : '—')}</p>
                       <p>You are ${lateDeltaMinutes} minute(s) late. Do you want to send a late/adjustment request instead?</p>`,
                showCancelButton: true,
                confirmButtonText: 'Send Adjustment Request',
                cancelButtonText: 'Cancel'
              }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
              return;
            } else {
              Swal.fire({
                icon: 'warning',
                title: 'Outside allowed time',
                html: `<p>Your clock-in is outside the allowed window.</p>
                       <p><strong>${amLabel}:</strong> ${canonicalStart ? friendlyWindowLabel(canonicalStart, addMinutesToTimeStr(canonicalStart, 60)) : (modalStart ? friendlyWindowLabel(modalStart, modalComputedEnd) : '—')}</p>
                       <p>Do you want to send a late/adjustment request instead?</p>`,
                showCancelButton: true,
                confirmButtonText: 'Send Adjustment Request',
                cancelButtonText: 'Cancel'
              }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
              return;
            }
          }
        } else {
          sendLateRequest();
          return;
        }
      } else if (!timeOutMorning) {
        // Clocking out for AM: check shift-split break out or normal AM out
        if (activeSplit && inBreakOutWindow(phTimeNow, activeSplit)) {
          confirmAndSetTime(`Clock out for break (${activeSplit.break_name})`, setTimeOutMorning, 'time_out_morning', phTimeNow);
          return;
        }

        if (win && isWithinWindow(phTimeNow, win.valid_out_start, win.valid_out_end)) {
          confirmAndSetTime('Clock out for AM', setTimeOutMorning, 'time_out_morning', phTimeNow);
        } else {
          // --- ALLOW EARLY OUT FOR AM: check scheduled AM end and offer early-out confirmation ---
          const scheduledAmOut = workTime?.end_time || (win && (win.valid_out_end || win.valid_out_start)) || null;
          if (scheduledAmOut) {
            const scheduledAmOutDate = getDateForTimeStr(phTimeNow, scheduledAmOut);
            if (scheduledAmOutDate && phTimeNow.getTime() < scheduledAmOutDate.getTime()) {
              Swal.fire({
                icon: 'warning',
                title: 'Early out (AM)',
                html: `<p>You are attempting to clock out before the scheduled end of your AM shift.</p>
                       <p>Scheduled end: <strong>${scheduledAmOutDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })}</strong></p>
                       <p>Do you want to proceed and record an early clock-out?</p>`,
                showCancelButton: true,
                confirmButtonText: 'Clock Out Early',
                cancelButtonText: 'Cancel'
              }).then((res) => {
                if (res.isConfirmed) {
                  confirmAndSetTime('Clock out (early)', setTimeOutMorning, 'time_out_morning', phTimeNow);
                }
              });
              return;
            }
          }

          const allowedText = win ? friendlyWindowLabel(win.valid_out_start, win.valid_out_end) : '—';
          Swal.fire({
            icon: 'warning',
            title: 'Outside allowed time',
            html: `<p>Your clock-out is outside the allowed window.</p>
                   <p><strong>Allowed Clock-out (AM):</strong> ${allowedText}</p>
                   <p>Send a late/adjustment request?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Send Adjustment Request'
          }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
        }
      } else {
        setAmPmMode('PM');
      }
    } else {
      // PM logic for split-shift (unchanged semantics) — time in/out based on break valid_break_in/valid_break_out and work_time valid_out
      // PM logic for split-shift (improved — prefer break's valid_break_in window, with +1h extension)
if (!timeInAfternoon) {
  // find the canonical shift-split break (if any)
  const splitBreak = getBreaks().find(x => Number(x.is_shift_split) === 1) || null;

  // prefer computed fields, then valid_*, then derived from break_start
  const breakPmStart = splitBreak ? (splitBreak.computed_valid_break_in_start || splitBreak.valid_break_in_start || addMinutesToTimeStr(splitBreak.break_start, 30)) : null;
  const breakPmEnd   = splitBreak ? (splitBreak.computed_valid_break_in_end   || splitBreak.valid_break_in_end   || splitBreak.break_end) : null;

  // extension: allow 1 hour after breakPmEnd
  const breakPmEndExtended = breakPmEnd ? addMinutesToTimeStr(breakPmEnd, 60) : null;

  // fallback: allowed_windows / workTime valid_in if no split break
  const fallbackPmStart = (workTime && (workTime.valid_in_start || (workTime.allowed_windows && workTime.allowed_windows.valid_in_start))) || null;
  const fallbackPmEnd   = (workTime && (workTime.valid_in_end   || (workTime.allowed_windows && workTime.allowed_windows.valid_in_end)))   || (fallbackPmStart ? addMinutesToTimeStr(fallbackPmStart, 60) : null);

  console.log('[pm] splitBreak present?', !!splitBreak, 'breakPm:', breakPmStart, breakPmEnd, 'breakPmExtendedEnd:', breakPmEndExtended, 'fallbackPm:', fallbackPmStart, fallbackPmEnd);

  // 1) If a split break is defined and the user is inside its break-in window -> allow PM clock-in
  if (breakPmStart && breakPmEnd && isWithinWindow(phTimeNow, breakPmStart, breakPmEnd)) {
    console.log('[pm] inside break-in window -> allow PM clock-in');
    confirmAndSetTime(`Clock in for PM (post-break)`, setTimeInAfternoon, 'time_in_afternoon', phTimeNow);
    return;
  }

  // 1b) If inside the 1-hour extension after break end -> allow PM clock-in but label as within extension
  if (breakPmStart && breakPmEndExtended && isWithinWindow(phTimeNow, breakPmEnd, breakPmEndExtended)) {
    console.log('[pm] inside 1h extension after break end -> allow PM clock-in (within extension)');
    confirmAndSetTime(`Clock in for PM (post-break — within 1h extension)`, setTimeInAfternoon, 'time_in_afternoon', phTimeNow);
    return;
  }

  // 2) If split break exists but not in window/extension -> apply late/adjustment behavior similar to AM
  if (splitBreak) {
    // If user already clocked out for morning (i.e. took the break), compute lateness relative to canonical start_time
    if (timeOutMorning && !timeInAfternoon) {
      const canonicalStart = workTime?.start_time || workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || fallbackPmStart || null;
      const startDTModal = canonicalStart ? getDateForTimeStr(phTimeNow, canonicalStart) : null;
      const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;

      // if within grace (0 < late < 60): show small-late dialog offering adjustment
      if (lateDeltaMinutes !== null && lateDeltaMinutes > 0 && lateDeltaMinutes < 60) {
        const allowedText = (breakPmStart && breakPmEnd) ? friendlyWindowLabel(breakPmStart, breakPmEnd) : (fallbackPmStart && fallbackPmEnd ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—');
        Swal.fire({
          icon: 'warning',
          title: 'Outside allowed time',
          html: `<p>Your clock-in is outside the allowed window.</p>
                 <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
                 <p>You are ${lateDeltaMinutes} minute(s) late. Do you want to send a late/adjustment request instead?</p>`,
          showCancelButton: true,
          confirmButtonText: 'Send Adjustment Request',
          cancelButtonText: 'Cancel'
        }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
        return;
      }

      // if >= 60 minutes late -> offer adjustment request
      if (lateDeltaMinutes !== null && lateDeltaMinutes >= 60) {
        const allowedText = (breakPmStart && breakPmEnd) ? friendlyWindowLabel(breakPmStart, breakPmEnd) : (fallbackPmStart && fallbackPmEnd ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—');
        Swal.fire({
          icon: 'warning',
          title: 'Outside allowed time',
          html: `<p>Your clock-in is outside the allowed window.</p>
                 ${lateDeltaMinutes !== null ? `<p>You are ${lateDeltaMinutes} minute(s) late.</p>` : ''}
                 <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
                 <p>Do you want to send a late/adjustment request instead?</p>`,
          showCancelButton: true,
          confirmButtonText: 'Send Adjustment Request',
          cancelButtonText: 'Cancel'
        }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
        return;
      }

      // else (no canonical start to compare or no lateness) fallback to "outside allowed" UI
      const allowedText = (breakPmStart && breakPmEnd) ? friendlyWindowLabel(breakPmStart, breakPmEnd) : (fallbackPmStart && fallbackPmEnd ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—');
      Swal.fire({
        icon: 'warning',
        title: 'Outside allowed time',
        html: `<p>Your clock-in is outside the allowed window.</p>
               <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
               <p>Send a late/adjustment request?</p>`,
        showCancelButton: true,
        confirmButtonText: 'Send Adjustment Request'
      }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
      return;
    }

    // If user hasn't clocked out for morning, we shouldn't allow PM clock-in — show standard UI
    const allowedText = (breakPmStart && breakPmEnd) ? friendlyWindowLabel(breakPmStart, breakPmEnd) : (fallbackPmStart && fallbackPmEnd ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—');
    Swal.fire({
      icon: 'warning',
      title: 'Outside allowed time',
      html: `<p>Your clock-in is outside the allowed window.</p>
             <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
             <p>Send a late/adjustment request?</p>`,
      showCancelButton: true,
      confirmButtonText: 'Send Adjustment Request'
    }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
    return;
  }

  // 3) No split break configured: fallback to allowed_windows (existing behaviour)
  if (fallbackPmStart && fallbackPmEnd && isWithinWindow(phTimeNow, fallbackPmStart, fallbackPmEnd)) {
    confirmAndSetTime('Clock in for PM', setTimeInAfternoon, 'time_in_afternoon', phTimeNow);
    return;
  }

  const allowedText = (fallbackPmStart && fallbackPmEnd) ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—';
  Swal.fire({
    icon: 'warning',
    title: 'Outside allowed time',
    html: `<p>Your clock-in is outside the allowed window.</p>
           <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
           <p>Send a late/adjustment request?</p>`,
    showCancelButton: true,
    confirmButtonText: 'Send Adjustment Request'
  }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
  return;
}
 else if (!timeOutAfternoon) {
        if (win && isWithinWindow(phTimeNow, win.valid_out_start, win.valid_out_end)) {
          confirmAndSetTime('Clock out for PM', setTimeOutAfternoon, 'time_out_afternoon', phTimeNow);
        } else {
          // --- ALLOW EARLY OUT FOR PM: check scheduled PM end and offer early-out confirmation ---
          const scheduledPmOut = workTime?.end_time || (win && (win.valid_out_end || win.valid_out_start)) || null;
          if (scheduledPmOut) {
            const scheduledPmOutDate = getDateForTimeStr(phTimeNow, scheduledPmOut);
            if (scheduledPmOutDate && phTimeNow.getTime() < scheduledPmOutDate.getTime()) {
              Swal.fire({
                icon: 'warning',
                title: 'Early out (PM)',
                html: `<p>You are attempting to clock out before the scheduled end of your shift.</p>
                       <p>Scheduled end: <strong>${scheduledPmOutDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' })}</strong></p>
                       <p>Do you want to proceed and record an early clock-out?</p>`,
                showCancelButton: true,
                confirmButtonText: 'Clock Out Early',
                cancelButtonText: 'Cancel'
              }).then((res) => {
                if (res.isConfirmed) {
                  confirmAndSetTime('Clock out (early)', setTimeOutAfternoon, 'time_out_afternoon', phTimeNow);
                }
              });
              return;
            }
          }

          const allowedText = win ? friendlyWindowLabel(win.valid_out_start, win.valid_out_end) : '—';
          Swal.fire({
            icon: 'warning',
            title: 'Outside allowed time',
            html: `<p>Your clock-out is outside the allowed window.</p>
                   <p><strong>Allowed Clock-out (PM):</strong> ${allowedText}</p>
                   <p>Send a late/adjustment request?</p>`,
            showCancelButton: true,
            confirmButtonText: 'Send Adjustment Request'
          }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
        }
      } else {
        Swal.fire('Info', 'You have already clocked in and out for PM.', 'info');
      }
    }
  };

  // ---------- Render ----------
  const buttonLabel = computeButtonLabel();
  const buttonSub = computeButtonSubLabel();

  return (
    <div className="bg-[#f3f3f3] rounded-md drop-shadow-md w-full lg:w-[25rem]">
      <div className="flex items-center justify-start w-full gap-2 p-2 text-sm font-medium text-black">
        <span>{currentDate}</span>
        <span>|</span>
        <span>{currentTime}</span>
      </div>

      {/* schedule display */}
      <div className="w-full p-2 border-t border-b border-gray-200">
        {scheduleLoading ? (
          <div className="text-xs text-gray-600">Loading…</div>
        ) : (scheduleFound || defaultUsed) ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium leading-tight text-gray-800">
                    {scheduleFound ? 'Scheduled' : 'Default shift'}
                  </div>
                  <RecurrenceBadge rec={schedule?.recurrence_type || (defaultUsed ? 'daily' : null)} />
                  {defaultUsed && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-yellow-50 text-yellow-800">
                      Default
                    </span>
                  )}
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  {workTime?.shift_name
                    ? `${workTime.shift_name} ${workTime?.shift_code ? `• ${workTime.shift_code}` : ''}`
                    : `Work Time ID ${schedule?.work_time_id ?? workTime?.id ?? '—'}`}
                </div>

                <div className="flex flex-row gap-1 mt-2">
                  <DaysChips days={schedule?.days_of_week || workTime?.days_of_week} />
                  <div className="text-[11px] text-gray-500 flex gap-2 items-center">
                    <LucideCalendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Effective: {formatDateFriendly(schedule?.effective_date || workTime?.effective_date || selectedDate)}</span>
                    {schedule?.end_date && <span>• Ends: {formatDateFriendly(schedule.end_date)}</span>}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {/* optional display of shift times */}
              </div>
            </div>

            {scheduleFound && schedule?.recurrence_type === 'weekly' && schedule?.days_of_week && (
              <div className="text-[11px] text-gray-500">Repeats weekly on: {schedule.days_of_week}</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500">No schedule set for this date</div>
        )}

        {scheduleError && <div className="mt-1 text-xs text-red-500">Schedule error: {scheduleError}</div>}
      </div>

      {/* attendance summary */}
      <div className="flex flex-row justify-around w-full p-2">
        <div className="flex flex-row justify-around w-full">
          <span className="text-xs text-center text-gray-500">Time In:</span>
          <div className="text-xs text-center text-gray-500 rounded ">
            {amPmMode === 'AM'
              ? to12HourFormat(timeInMorning) || '-'
              : to12HourFormat(timeInAfternoon) || '-'}
          </div>
        </div>

        <div className="w-px mx-2 bg-gray-300" />

        <div className="flex flex-row justify-around w-full">
          <span className="text-xs text-center text-gray-500">Time Out:</span>
          <div className="text-xs text-center text-gray-500 rounded ">
            {amPmMode === 'AM'
              ? to12HourFormat(timeOutMorning) || '-'
              : to12HourFormat(timeOutAfternoon) || '-'}
          </div>
        </div>
      </div>

      <button
        onClick={handleClick}
        disabled={isLoading || !phNow}
        className={`w-full mt-2 py-2 rounded text-white ${
          phNow && !isLoading ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
        }`}
        title={buttonSub || undefined}
        aria-label={buttonLabel}
      >
        <div className="flex flex-col items-center">
          <span>{buttonLabel}</span>
          {buttonSub && <small className="text-[11px] opacity-80">{buttonSub}</small>}
        </div>
      </button>
    </div>
  );
};

export default TimeInOut;



// // TimeInOut — supports is_shift_split control and full-shift behaviour
// import React, { useEffect, useRef, useState } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import Swal from 'sweetalert2';
// import useAttendance from '../Emp_TIO_HOOKS/useTIOAttendanceHooks';
// import { createAttendance, updateAttendance } from '../Emp_TimeInOutAPI/Emp_TIO_Api';
// import BASE_URL from '../../../../../backend/server/config';
// import '../../../../../Styles/globals.css';
// import { Clock as LucideClock, Calendar as LucideCalendar, Tag as LucideTag } from 'lucide-react';

// const TimeInOut = ({ employeeId: propEmployeeId, employeeName: propEmployeeName }) => {
//   const location = useLocation();
//   const navigate = useNavigate();

//   const { employeeId, employeeName } = propEmployeeId && propEmployeeName
//     ? { employeeId: propEmployeeId, employeeName: propEmployeeName }
//     : location.state || {};

//   const lastSyncedIso = typeof window !== 'undefined' ? localStorage.getItem('ph_last_synced') : null;
//   const initialSelectedDate = lastSyncedIso
//     ? new Date(lastSyncedIso).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
//     : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

//   const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
//   const {
//     attendanceId,
//     timeInMorning,
//     timeOutMorning,
//     timeInAfternoon,
//     timeOutAfternoon,
//     setTimeInMorning,
//     setTimeOutMorning,
//     setTimeInAfternoon,
//     setTimeOutAfternoon,
//   } = useAttendance(employeeId, selectedDate);

//   // PH time
//   const [phNow, setPhNow] = useState(null);
//   const [currentDate, setCurrentDate] = useState('');
//   const [currentTime, setCurrentTime] = useState('');
//   const [amPmMode, setAmPmMode] = useState('AM');
//   const [isLoading, setIsLoading] = useState(false);

//   // schedule state
//   const [scheduleLoading, setScheduleLoading] = useState(false);
//   const [schedule, setSchedule] = useState(null);
//   const [workTime, setWorkTime] = useState(null);
//   const [scheduleFound, setScheduleFound] = useState(false);
//   const [scheduleError, setScheduleError] = useState(null);
//   const [defaultUsed, setDefaultUsed] = useState(false);

//   // refs/helpers
//   const offsetRef = useRef(0);
//   const mountedRef = useRef(true);
//   const syncInFlightRef = useRef(false);
//   const RESYNC_INTERVAL_MS = 10 * 60 * 1000;
//   const DEVICE_DIFF_THRESHOLD_MIN = 2;

//   useEffect(() => {
//     mountedRef.current = true;
//     return () => { mountedRef.current = false; };
//   }, []);

//   const fetchPHTimeFromAPI = async () => {
//     try {
//       const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Manila');
//       if (!res.ok) throw new Error(`timeapi.io status ${res.status}`);
//       const data = await res.json();
//       return new Date(data.dateTime);
//     } catch {
//       const res2 = await fetch('https://worldtimeapi.org/api/timezone/Asia/Manila');
//       if (!res2.ok) throw new Error('fallback worldtimeapi failed');
//       const data2 = await res2.json();
//       return new Date(data2.datetime);
//     }
//   };

//   const syncWithServer = async (saveToLocal = true) => {
//     if (syncInFlightRef.current) return !!phNow;
//     syncInFlightRef.current = true;
//     try {
//       const serverNow = await fetchPHTimeFromAPI();
//       const offset = serverNow.getTime() - Date.now();
//       offsetRef.current = offset;
//       if (saveToLocal && typeof window !== 'undefined') {
//         try {
//           localStorage.setItem('ph_offset', String(offset));
//           localStorage.setItem('ph_last_synced', serverNow.toISOString());
//         } catch (e) {}
//       }
//       if (!mountedRef.current) return true;
//       const corrected = new Date(Date.now() + offsetRef.current);
//       setPhNow(corrected);
//       setCurrentTime(corrected.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Manila' }));
//       setCurrentDate(corrected.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' }));
//       setSelectedDate(corrected.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));

//       const hour = corrected.getHours();
//       const minute = corrected.getMinutes();
//       if (timeInAfternoon || timeOutAfternoon || (hour === 12 && minute >= 30) || hour > 12) setAmPmMode('PM');
//       else setAmPmMode('AM');

//       return true;
//     } catch (err) {
//       return false;
//     } finally {
//       syncInFlightRef.current = false;
//     }
//   };

//   useEffect(() => {
//     try {
//       const stored = typeof window !== 'undefined' ? localStorage.getItem('ph_offset') : null;
//       if (stored !== null) {
//         const parsed = Number(stored);
//         if (!Number.isNaN(parsed)) {
//           offsetRef.current = parsed;
//           const corrected = new Date(Date.now() + offsetRef.current);
//           setPhNow(corrected);
//           setCurrentTime(corrected.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Manila' })); 
//           setCurrentDate(corrected.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })); 
//           setSelectedDate(corrected.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
//           const hour = corrected.getHours();
//           const minute = corrected.getMinutes();
//           if (timeInAfternoon || timeOutAfternoon || (hour === 12 && minute >= 30) || hour > 12) setAmPmMode('PM');
//           else setAmPmMode('AM');
//         }
//       }
//     } catch (e) {}

//     const tick = setInterval(() => {
//       const corrected = new Date(Date.now() + offsetRef.current);
//       setPhNow(corrected);
//       setCurrentTime(corrected.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Manila' }));
//       setCurrentDate(corrected.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' }));
//       setSelectedDate(corrected.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
//       const hour = corrected.getHours();
//       const minute = corrected.getMinutes();
//       if (timeInAfternoon || timeOutAfternoon || (hour === 12 && minute >= 30) || hour > 12) setAmPmMode('PM');
//       else setAmPmMode('AM');
//     }, 1000);

//     syncWithServer(true).catch(() => {});
//     const resync = setInterval(() => {
//       syncWithServer(true);
//     }, RESYNC_INTERVAL_MS);

//     return () => {
//       clearInterval(tick);
//       clearInterval(resync);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [timeInMorning, timeOutMorning, timeInAfternoon, timeOutAfternoon]);

//   // ---------- fetch employee schedule ----------
//   useEffect(() => {
//     if (!employeeId || !selectedDate) {
//       setSchedule(null);
//       setWorkTime(null);
//       setScheduleFound(false);
//       setScheduleError(null);
//       setDefaultUsed(false);
//       return;
//     }

//     const ac = new AbortController();

//     const fetchDefaultWorkTime = async () => {
//       try {
//         const url = `${BASE_URL}/schedule-manager/get_shifts.php`;
//         const res = await fetch(url, { signal: ac.signal });
//         const json = await res.json();
//         const list = json?.work_times || json?.work_time || [];
//         if (Array.isArray(list) && list.length) {
//           const found = list.find((w) => w.is_default === 1 || w.is_default === '1' || w.is_default === true);
//           if (found) {
//             setWorkTime({ ...found, allowed_windows: found.allowed_windows || null, breaks: found.breaks || [] });
//             setSchedule(null);
//             setScheduleFound(false);
//             setDefaultUsed(true);
//             return true;
//           }
//         }
//       } catch (err) {
//         // ignore abort
//       }
//       return false;
//     };

//     // helper: fetch breaks for a work_time_id (same as before)
//     const fetchBreaksByWorkTimeId = async (wtId, signal) => {
//       try {
//         if (!wtId) return { success: false, breaks: [] };
//         const qs = new URLSearchParams({ work_time_id: String(wtId) });
//         const url = `${BASE_URL}/schedule-manager/get_breaks_by_work_time.php?${qs.toString()}`;
//         console.log('[breaks] requesting breaks for work_time_id=', wtId, 'url=', url);
//         const res = await fetch(url, { signal });
//         console.log('[breaks] HTTP status', res.status, 'ok=', res.ok);
//         if (!res.ok) {
//           const text = await res.text().catch(()=>null);
//           console.warn('[breaks] non-ok response', res.status, text);
//           return { success: false, message: `HTTP ${res.status}` };
//         }
//         const json = await res.json();
//         console.log('[breaks] response json for work_time_id=', wtId, json);
//         if (json && json.success) {
//           console.log(`[breaks] fetched ${Array.isArray(json.breaks) ? json.breaks.length : 0} break(s) for work_time_id=${wtId}`);
//           if (json.debug) console.debug('[breaks] debug object:', json.debug);
//           return { success: true, breaks: json.breaks || [], debug: json.debug || null };
//         }
//         console.warn('[breaks] endpoint returned success=false or no data', json);
//         if (json?.debug) console.debug('[breaks] debug payload:', json.debug);
//         return { success: false, message: json?.error || json?.message || 'no data', debug: json?.debug || null };
//       } catch (err) {
//         if (err && err.name === 'AbortError') {
//           console.log('[breaks] fetch aborted for work_time_id', wtId);
//           return { success: false, message: 'aborted' };
//         }
//         console.error('[breaks] fetch error for work_time_id', wtId, err);
//         return { success: false, message: err?.message || String(err) };
//       }
//     };

// const breakInEndExtended = (b) => {
//   const end = breakInEnd(b);
//   return end ? addMinutesToTimeStr(end, 60) : null;
// };

// const inBreakInWindowExtended = (phTime, b) => {
//   if (!b) return false;
//   // inside normal break-in window
//   if (inBreakInWindow(phTime, b)) return true;
//   // or inside 1-hour extension after break_in_end
//   const end = breakInEnd(b);
//   const endExt = breakInEndExtended(b);
//   if (end && endExt && isWithinWindow(phTime, end, endExt)) return true;
//   return false;
// };

//     const fetchSchedule = async () => {
//       setScheduleLoading(true);
//       setScheduleError(null);
//       setDefaultUsed(false);
//       try {
//         const url = `${BASE_URL}/schedule-manager/get_employee_shift_window.php?employee_id=${encodeURIComponent(employeeId)}&date=${encodeURIComponent(selectedDate)}`;
//         const res = await fetch(url, { signal: ac.signal });
//         const json = await res.json();

//         console.log('get_employee_shift_window response', { url, payload: json, employeeId, selectedDate });

//         if (json && json.success) {
//           setSchedule(json.schedule || null);
//           const sourceWork = json.work_time || (json.default_used && json.default_work_time ? json.default_work_time : null) || {};
//           const combinedWork = { ...sourceWork, allowed_windows: json.allowed_windows || null, breaks: json.breaks || [] };

//           console.log('[breaks] breaks present on get_employee_shift_window:', Array.isArray(json.breaks) ? json.breaks.length : 0, 'items:', json.breaks || null);

//           setWorkTime(combinedWork);
//           setScheduleFound(!!json.found);
//           setDefaultUsed(!!json.default_used);

//           // ensure breaks are filled by calling get_breaks_by_work_time.php if needed
//           const wtId = (combinedWork && (combinedWork.id || combinedWork.work_time_id)) || (json?.schedule && json.schedule.work_time_id) || null;
//           const numericWtId = wtId ? Number(wtId) : null;

//           if (numericWtId) {
//             console.log('[breaks] will fetch breaks for numericWtId=', numericWtId);
//             const brResp = await fetchBreaksByWorkTimeId(numericWtId, ac.signal);
//             if (brResp.success) {
//               console.log('[breaks] merging fetched breaks into workTime (count=', (brResp.breaks||[]).length, ')');
//               setWorkTime(prev => {
//                 const base = prev || combinedWork || {};
//                 const newBreaks = (brResp.breaks && Array.isArray(brResp.breaks) && brResp.breaks.length) ? brResp.breaks : (base.breaks || []);
//                 console.log('[breaks] setWorkTime -> breaks length', newBreaks.length);
//                 return { ...base, breaks: newBreaks };
//               });
//             } else {
//               console.warn('[breaks] fetchBreaksByWorkTimeId failed for', numericWtId, 'message:', brResp.message || null);
//               if (brResp.debug) console.debug('[breaks] debug info:', brResp.debug);
//             }
//           } else {
//             console.warn('[breaks] no numeric work_time_id available to fetch breaks:', wtId);
//           }

//         } else {
//           if (json && json.default_used && json.default_work_time) {
//             setWorkTime({ ...(json.default_work_time || {}), allowed_windows: json.allowed_windows || null, breaks: json.breaks || [] });
//             setSchedule(null);
//             setScheduleFound(false);
//             setDefaultUsed(true);
//             console.warn('Using default work_time provided by backend.');
//           } else {
//             const gotDefault = await fetchDefaultWorkTime();
//             if (!gotDefault) {
//               setSchedule(null);
//               setWorkTime(null);
//               setScheduleFound(false);
//               setDefaultUsed(false);
//             }
//           }
//         }
//       } catch (err) {
//         if (err.name !== 'AbortError') {
//           setScheduleError(err.message || String(err));
//           console.error('fetchSchedule error', err);
//         } else {
//           console.log('fetchSchedule aborted');
//         }
//       } finally {
//         setScheduleLoading(false);
//       }
//     };

//     fetchSchedule();
//     return () => ac.abort();
//   }, [employeeId, selectedDate]);

//   // Helpers
//   const formatTime = (date) =>
//     `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

//   const to12HourFormat = (timeStr) => {
//     if (!timeStr) return '';
//     const parts = timeStr.split(':');
//     const hours = parseInt(parts[0], 10) || 0;
//     const minutes = parseInt(parts[1], 10) || 0;
//     const seconds = parseInt(parts[2], 10) || 0;
//     const base = phNow ? new Date(phNow) : new Date(Date.now() + offsetRef.current);
//     base.setHours(hours, minutes, seconds, 0);
//     return base.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
//   };

//   const formatDateFriendly = (isoDate) => {
//     if (!isoDate) return '—';
//     try {
//       const d = new Date(isoDate + 'T00:00:00');
//       return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
//     } catch (e) {
//       return isoDate;
//     }
//   };

//   const parseDays = (daysRaw) => {
//     if (!daysRaw) return [];
//     if (Array.isArray(daysRaw)) return daysRaw;
//     return daysRaw.split(',').map(s => s.trim()).filter(Boolean);
//   };

//   const RecurrenceBadge = ({ rec }) => {
//     if (!rec) return null;
//     const label = rec === 'none' ? 'One-off' : rec.charAt(0).toUpperCase() + rec.slice(1);
//     return (
//       <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-blue-50 text-blue-800">
//         <LucideTag className="w-3 h-3 mr-1" /> {label}
//       </span>
//     );
//   };

//   const DaysChips = ({ days }) => {
//     const list = parseDays(days);
//     if (!list.length) return null;
//     return (
//       <div className="flex flex-wrap gap-1">
//         {list.map((d) => (
//           <div key={d} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">{d}</div>
//         ))}
//       </div>
//     );
//   };

//   // --- Window helpers (use allowed_windows from backend) ---
//   const getDateForTimeStr = (baseDate, timeStr) => {
//     if (!timeStr) return null;
//     const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0);
//     const d = new Date(baseDate); // clone
//     d.setHours(parts[0], parts[1], parts[2] || 0, 0);
//     return d;
//   };

//   const addMinutesToTimeStr = (timeStr, minutesToAdd) => {
//     if (!timeStr) return null;
//     const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0);
//     const dt = new Date();
//     dt.setHours(parts[0], parts[1], parts[2] || 0, 0);
//     dt.setMinutes(dt.getMinutes() + minutesToAdd);
//     const hh = String(dt.getHours()).padStart(2, '0');
//     const mm = String(dt.getMinutes()).padStart(2, '0');
//     const ss = String(dt.getSeconds()).padStart(2, '0');
//     return `${hh}:${mm}:${ss}`;
//   };

//   const isWithinWindow = (phTime, startStr, endStr) => {
//     if (!phTime || !startStr || !endStr) return false;
//     const startD = getDateForTimeStr(phTime, startStr);
//     const endD = getDateForTimeStr(phTime, endStr);
//     if (!startD || !endD) return false;
//     return phTime.getTime() >= startD.getTime() && phTime.getTime() <= endD.getTime();
//   };

//   const friendlyWindowLabel = (startStr, endStr) => {
//     if (!startStr || !endStr) return '—';
//     const base = phNow || new Date(Date.now() + offsetRef.current);
//     const s = getDateForTimeStr(base, startStr);
//     const e = getDateForTimeStr(base, endStr);
//     return `${s ? s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' }) : '—'} - ${e ? e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' }) : '—'}`;
//   };

//   // --- Break helpers (front-end)
//   const getBreaks = () => (workTime && workTime.breaks && Array.isArray(workTime.breaks)) ? workTime.breaks : [];

//   // Break window helpers: prefer computed_* from backend, else derive
//   const breakOutStart = (b) => b.computed_valid_break_out_start || b.valid_break_out_start || b.break_start;
//   const breakOutEnd = (b) => b.computed_valid_break_out_end || b.valid_break_out_end || addMinutesToTimeStr(b.break_start, 30);
//   const breakInStart = (b) => b.computed_valid_break_in_start || b.valid_break_in_start || addMinutesToTimeStr(b.break_start, 30);
//   const breakInEnd = (b) => b.computed_valid_break_in_end || b.valid_break_in_end || b.break_end;

//   // check if ANY break is marked as shift split
//   const hasShiftSplit = () => getBreaks().some(x => Number(x.is_shift_split) === 1);

//   // find active shift-split break that matches current phTime (prefers first match)
//   const findActiveSplitBreak = (phTime) => {
//     const list = getBreaks().filter(x => Number(x.is_shift_split) === 1);
//     for (const b of list) {
//       if (isWithinWindow(phTime, breakOutStart(b), breakOutEnd(b)) || isWithinWindow(phTime, breakInStart(b), breakInEnd(b))) {
//         return b;
//       }
//     }
//     return null;
//   };

//   const inBreakOutWindow = (phTime, b) => {
//     if (!b) return false;
//     return isWithinWindow(phTime, breakOutStart(b), breakOutEnd(b));
//   };
//   const inBreakInWindow = (phTime, b) => {
//     if (!b) return false;
//     return isWithinWindow(phTime, breakInStart(b), breakInEnd(b));
//   };

//   // 1-hour cutoff helper: returns true if phNow > (timeStr + minutes)
//   const isPastLateCutoff = (timeStr, minutes = 60) => {
//     if (!timeStr || !phNow) return false;
//     const cutoff = getDateForTimeStr(phNow, timeStr);
//     if (!cutoff) return false;
//     cutoff.setMinutes(cutoff.getMinutes() + minutes);
//     return phNow.getTime() > cutoff.getTime();
//   };

//   // UI label helpers updated to consider hasShiftSplit (full-shift vs split-shift)
//   const computeButtonLabel = () => {
//     const phTimeNow = phNow || new Date(Date.now() + offsetRef.current);
//     const activeSplitCurrent = findActiveSplitBreak(phTimeNow);
//     const split = hasShiftSplit();

//     if (!split) {
//       // full-shift: single clock-in and single clock-out (AM used as canonical)
//       if (!timeInMorning) return 'Clock In';
//       if (timeInMorning && !timeOutMorning) return 'Clock Out';
//       return 'Done';
//     }

//     // split-shift behaviour (existing)
//     if (amPmMode === 'AM') {
//       if (!timeInMorning) {
//         if (activeSplitCurrent && inBreakInWindow(phTimeNow, activeSplitCurrent)) return `Clock In (post-break)`;
//         return `Clock In`;
//       }
//       if (timeInMorning && !timeOutMorning) {
//         if (activeSplitCurrent && inBreakOutWindow(phTimeNow, activeSplitCurrent)) return `Clock Out for Break (${activeSplitCurrent.break_name || 'Break'})`;
//         return `Clock Out`;
//       }
//       return `Next PM`;
//     }

//     // PM mode
//     if (!timeInAfternoon) return `Clock In`;
//     if (timeInAfternoon && !timeOutAfternoon) return `Clock Out`;
//     return `Done`;
//   };

//   const computeButtonSubLabel = () => {
//     const phTimeNow = phNow || new Date(Date.now() + offsetRef.current);
//     const activeSplitCurrent = findActiveSplitBreak(phTimeNow);
//     const split = hasShiftSplit();

//     if (!split) {
//       if (!timeInMorning) {
//         return ''; // normal
//       }
//       if (timeInMorning && !timeOutMorning) {
//         return `This will record your final clock-out for the day.`; 
//       }
//       return '';
//     }

//     if (amPmMode === 'AM') {
//       if (!timeInMorning) {
//         if (activeSplitCurrent && inBreakInWindow(phTimeNow, activeSplitCurrent)) return `You are in the break-in window — clocking in will record start of AM after break.`;
//         return '';
//       }
//       if (timeInMorning && !timeOutMorning) {
//         if (activeSplitCurrent && inBreakOutWindow(phTimeNow, activeSplitCurrent)) return `You are in the break-out window — this will record a break start (time out AM).`;
//         return '';
//       }
//       return '';
//     }

//     return '';
//   };

//   // Confirm + save wrapper (unchanged)
//   const showSwal = async (promiseFn, loadingMsg, successMsg) => {
//     setIsLoading(true);
//     Swal.fire({
//       title: 'Please wait...',
//       text: loadingMsg,
//       allowOutsideClick: false,
//       didOpen: () => Swal.showLoading(),
//     });
//     await new Promise((res) => setTimeout(res, 800));
//     try {
//       const response = await promiseFn();
//       Swal.close();
//       if (response?.data?.success) {
//         Swal.fire('Success', successMsg, 'success');
//       } else {
//         Swal.fire('Failed', response?.data?.message || 'Unexpected error.', 'error');
//       }
//     } catch (err) {
//       Swal.close();
//       Swal.fire('Error', err?.message || 'Something went wrong.', 'error');
//     }
//     setIsLoading(false);
//   };

//   const sendLateRequest = () => {
//     const win = workTime?.allowed_windows || {};
//     const canonicalStart = workTime?.start_time || null;
//     const modalStart = canonicalStart || workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || null;
//     const modalComputedEnd = modalStart ? addMinutesToTimeStr(modalStart, 60) : null;

//     const usingStartType = canonicalStart ? 'start_time' : (workTime?.valid_in_start ? 'valid_in_start' : (workTime?.allowed_windows?.valid_in_start ? 'allowed_windows.valid_in_start' : 'none'));

//     const amLabel = usingStartType === 'start_time' ? 'Time In AM (start_time)' :
//                     usingStartType === 'valid_in_start' ? 'Time In AM (valid_in_start fallback)' :
//                     usingStartType === 'allowed_windows.valid_in_start' ? 'Time In AM (window fallback)' :
//                     'Time In AM';

//     const amIn = modalStart ? friendlyWindowLabel(modalStart, modalComputedEnd) : '—';
//     const amOut = friendlyWindowLabel(win.valid_out_start, win.valid_out_end);
//     const pmIn = friendlyWindowLabel(win.valid_in_start, win.valid_in_end);
//     const pmOut = friendlyWindowLabel(win.valid_out_start, win.valid_out_end);

//     const br = getBreaks();
//     const breaksHtml = br.length ? `<br/><strong>Breaks:</strong><br/>${br.map(b => `${b.break_name}: ${friendlyWindowLabel(breakOutStart(b), breakOutEnd(b))} (out) / ${friendlyWindowLabel(breakInStart(b), breakInEnd(b))} (in)`).join('<br/>')}` : '';

//     Swal.fire({
//       icon: 'warning',
//       title: 'Outside allowed time',
//       html: `
//         <p>You are outside the allowed time window.</p>
//         <br />
//         <strong>${amLabel}:</strong> ${amIn}<br/>
//         <strong>Time Out AM:</strong> ${amOut}<br/>
//         <strong>Time In PM:</strong> ${pmIn}<br/>
//         <strong>Time Out PM:</strong> ${pmOut}<br/>
//         ${breaksHtml}
//         <br />
//         Do you want to send a late request?
//       `,
//       showCancelButton: true,
//       confirmButtonText: 'Adj. Request',
//     }).then((res) => {
//       if (res.isConfirmed) {
//         navigate('/employee/late-request', { state: { employeeId, employeeName } });
//       }
//     });
//   };

//   const confirmAndSetTime = (label, setTimeCallback, timeKey, phTimeArg) => {
//     const useTime = phTimeArg || phNow;
//     if (!useTime) {
//       Swal.fire('Error', 'Unable to determine Philippine time. Please check your connection and try again.', 'error');
//       return;
//     }
//     const formattedTime = formatTime(useTime);

//     Swal.fire({
//       icon: 'question',
//       title: `${label}?`,
//       text: attendanceId ? 'Attendance already exists. Do you want to update it?' : 'Do you want to submit this record?',
//       showCancelButton: true,
//       confirmButtonText: attendanceId ? 'Update' : 'Submit',
//     }).then((res) => {
//       if (res.isConfirmed) {
//         setTimeCallback(formattedTime);
//         const formData = {
//           attendance_id: attendanceId,
//           attendance_date: useTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
//           employee_id: employeeId,
//           employee_name: employeeName,
//           time_in_morning: timeKey === 'time_in_morning' ? formattedTime : timeInMorning,
//           time_out_morning: timeKey === 'time_out_morning' ? formattedTime : timeOutMorning,
//           time_in_afternoon: timeKey === 'time_in_afternoon' ? formattedTime : timeInAfternoon,
//           time_out_afternoon: timeKey === 'time_out_afternoon' ? formattedTime : timeOutAfternoon,
//         };

//         const apiCall = attendanceId
//           ? () => updateAttendance(formData)
//           : () => createAttendance(formData);

//         showSwal(apiCall, attendanceId ? 'Updating attendance...' : 'Submitting attendance...', 'Attendance saved successfully!');
//       }
//     });
//   };

//   // ---------- Main click handler (updated to respect is_shift_split) ----------
//   const handleClick = async () => {
//     if (!phNow) {
//       const ok = await syncWithServer(true);
//       if (!ok && !phNow) {
//         Swal.fire('Error', 'Unable to determine Philippine time. Please check your connection and try again.', 'error');
//         return;
//       }
//     }

//     const phTimeNow = phNow || new Date(Date.now() + offsetRef.current);
//     const deviceNow = new Date();
//     const diffMinutes = Math.abs((deviceNow.getTime() - phTimeNow.getTime()) / 60000);
//     const deviceDateEnCA = deviceNow.toLocaleDateString('en-CA');
//     const phDateEnCA = phTimeNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

//     if (diffMinutes > DEVICE_DIFF_THRESHOLD_MIN || deviceDateEnCA !== phDateEnCA) {
//       const formatReadable = (date, usePHZone = false) =>
//         date.toLocaleString('en-US', {
//           year: 'numeric',
//           month: 'long',
//           day: 'numeric',
//           hour: 'numeric',
//           minute: '2-digit',
//           hour12: true,
//           timeZone: usePHZone ? 'Asia/Manila' : undefined,
//         });

//       const deviceReadable = formatReadable(deviceNow, false);
//       const phReadable = formatReadable(phTimeNow, true);

//       const result = await Swal.fire({
//         icon: 'warning',
//         title: 'Device time mismatch',
//         html: `
//           <p>Your device time/date does not match the official Philippine time.</p>
//           <p><strong>Device Time:</strong> ${deviceReadable}</p>
//           <p><strong>PH Time:</strong> ${phReadable}</p>
//           <br/>
//           <p>Please correct your device time/date or press <strong>Sync PH Time</strong> to refresh PH time.</p>
//         `,
//         showCancelButton: true,
//         confirmButtonText: 'Sync PH Time',
//         cancelButtonText: 'Cancel',
//       });

//       if (result.isConfirmed) {
//         const ok = await syncWithServer(true);
//         if (!ok) {
//           Swal.fire('Error', 'Unable to sync Philippine time. Please check your connection.', 'error');
//         } else {
//           return handleClick();
//         }
//       }
//       return;
//     }

//     const todayPhDate = phTimeNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
//     const isTodayLocal = selectedDate === todayPhDate;
//     if (!isTodayLocal) {
//       Swal.fire('View Only', 'You can only edit attendance for today.', 'info');
//       return;
//     }

//     const win = workTime?.allowed_windows || {};
//     const split = hasShiftSplit();
//     const activeSplit = findActiveSplitBreak(phTimeNow);

//     console.log('[click] split?', split, 'activeSplit:', activeSplit);

//     // FULL-SHIFT (no split break) behaviour: single clock-in and single clock-out
//     if (!split) {
//       // canonicalStart and windows
//       const canonicalStart = workTime?.start_time || null;
//       // const windowInStart = workTime?.valid_in_start || win.valid_in_start || canonicalStart || null;
//       const windowInStart = (win && (win.valid_in_start || null)) || workTime?.valid_in_start || canonicalStart || null;
//       // const windowInEnd = workTime?.valid_in_end || win.valid_in_end || (windowInStart ? addMinutesToTimeStr(windowInStart, 60) : null);
//       const windowInEnd = (win && (win.valid_in_end || null)) || workTime?.valid_in_end || (windowInStart ? addMinutesToTimeStr(windowInStart, 60) : null);
//       const windowOutStart = workTime?.valid_out_start || win.valid_out_start || null;
//       const windowOutEnd = workTime?.valid_out_end || win.valid_out_end || null;

//       // 1) if not clocked in yet -> clock-in (subject to allowed_in window and late cutoff)
//       if (!timeInMorning) {
//         // allow immediate clock-in if inside allowed window
//         if (windowInStart && windowInEnd && isWithinWindow(phTimeNow, windowInStart, windowInEnd)) {
//           confirmAndSetTime('Clock in', setTimeInMorning, 'time_in_morning', phTimeNow);
//           return;
//         }

//         // if late but less than 60 min -> prompt adjustment
//         const startBase = canonicalStart || windowInStart;
//         if (startBase && isPastLateCutoff(startBase, 60)) {
//           // more than 60 min late -> offer late request
//           const startDTModal = startBase ? getDateForTimeStr(phTimeNow, startBase) : null;
//           const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;
//           Swal.fire({
//             icon: 'warning',
//             title: 'Outside allowed time',
//             html: `<p>Your clock-in is outside the allowed window.</p>
//                    ${lateDeltaMinutes !== null ? `<p>You are ${lateDeltaMinutes} minute(s) late.</p>` : ''}
//                    <p>Do you want to send a late/adjustment request instead?</p>`,
//             showCancelButton: true,
//             confirmButtonText: 'Send Adjustment Request'
//           }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//           return;
//         }

//         // if not in window but within 60 minutes late -> offer to send adjustment
//         const startDTModal = startBase ? getDateForTimeStr(phTimeNow, startBase) : null;
//         const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;
//         if (lateDeltaMinutes !== null && lateDeltaMinutes > 0 && lateDeltaMinutes < 60) {
//           Swal.fire({
//             icon: 'warning',
//             title: 'Outside allowed time',
//             html: `<p>Your clock-in is outside the allowed window.</p>
//                    <p>You are ${lateDeltaMinutes} minute(s) late. Do you want to send a late/adjustment request instead?</p>`,
//             showCancelButton: true,
//             confirmButtonText: 'Send Adjustment Request',
//             cancelButtonText: 'Cancel'
//           }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//           return;
//         }

//         // fallback: use sendLateRequest UI
//         sendLateRequest();
//         return;
//       }

//       // 2) already clocked in but not clocked out -> final clock-out (use valid_out window)
//       if (!timeOutMorning) {
//         if (windowOutStart && windowOutEnd && isWithinWindow(phTimeNow, windowOutStart, windowOutEnd)) {
//           confirmAndSetTime('Clock out', setTimeOutMorning, 'time_out_morning', phTimeNow);
//           return;
//         }

//         const allowedText = windowOutStart && windowOutEnd ? friendlyWindowLabel(windowOutStart, windowOutEnd) : '—';
//         Swal.fire({
//           icon: 'warning',
//           title: 'Outside allowed time',
//           html: `<p>Your clock-out is outside the allowed window.</p>
//                  <p><strong>Allowed Clock-out:</strong> ${allowedText}</p>
//                  <p>Send a late/adjustment request?</p>`,
//           showCancelButton: true,
//           confirmButtonText: 'Send Adjustment Request'
//         }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//         return;
//       }

//       // already clocked in/out
//       Swal.fire('Info', 'You have already clocked in and out for today.', 'info');
//       return;
//     }

//     // SPLIT-SHIFT behaviour (existing behaviour but tightened to use break is_shift_split)
//     // AM mode
//     if (amPmMode === 'AM') {
//       // 1) if user hasn't clocked IN morning
//       if (!timeInMorning) {
//         const canonicalStart = workTime?.start_time || null;
//         // const shiftStartForChecks = workTime?.start_time || workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || null;
//         const shiftStartForChecks = workTime?.start_time || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || workTime?.valid_in_start || null;

//         const computedAMEndForChecks = shiftStartForChecks ? addMinutesToTimeStr(shiftStartForChecks, 60) : null;
//         const modalStart = canonicalStart || workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || null;
//         const modalComputedEnd = modalStart ? addMinutesToTimeStr(modalStart, 60) : null;
//         const usingStartType = canonicalStart ? 'start_time' : (workTime?.valid_in_start ? 'valid_in_start' : (workTime?.allowed_windows?.valid_in_start ? 'allowed_windows.valid_in_start' : 'none'));
//         const amLabel = usingStartType === 'start_time' ? 'Allowed Clock-in (start_time)' :
//                         usingStartType === 'valid_in_start' ? 'Allowed Clock-in (valid_in_start fallback)' :
//                         usingStartType === 'allowed_windows.valid_in_start' ? 'Allowed Clock-in (window fallback)' :
//                         'Allowed Clock-in';

//         // allow immediate clock-in if inside post-break window (employee returning after break)
//         if (activeSplit && inBreakInWindowExtended(phTimeNow, activeSplit)) {
//           console.log('[break] in break-in window -> post-break clock-in permitted');
//           confirmAndSetTime(`Clock in for AM (post-break)`, setTimeInMorning, 'time_in_morning', phTimeNow);
//           return;
//         }

//         // cutoff >60 minutes after canonical start
//         const cutoffBase = canonicalStart || shiftStartForChecks;
//         if (cutoffBase && isPastLateCutoff(cutoffBase, 60)) {
//           const lateBase = canonicalStart || modalStart || shiftStartForChecks;
//           const startDTModal = lateBase ? getDateForTimeStr(phTimeNow, lateBase) : null;
//           const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;
//           Swal.fire({
//             icon: 'warning',
//             title: 'Outside allowed time',
//             html: `<p>Your clock-in is outside the allowed window.</p>
//                    ${lateDeltaMinutes !== null ? `<p>You are ${lateDeltaMinutes} minute(s) late.</p>` : ''}
//                    <p><strong>${amLabel}:</strong> ${canonicalStart ? friendlyWindowLabel(canonicalStart, addMinutesToTimeStr(canonicalStart, 60)) : (modalStart ? friendlyWindowLabel(modalStart, modalComputedEnd) : '—')}</p>
//                    <p>Do you want to send a late/adjustment request instead?</p>`,
//             showCancelButton: true,
//             confirmButtonText: 'Send Adjustment Request',
//             cancelButtonText: 'Cancel'
//           }).then((res) => {
//             if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } });
//           });
//           return;
//         }

//         // if currently inside a break-out window and break is shift-split, suggest clocking out for break instead
//         if (activeSplit && inBreakOutWindow(phTimeNow, activeSplit)) {
//           if (!timeOutMorning) {
//             confirmAndSetTime(`Clock out for break (${activeSplit.break_name})`, setTimeOutMorning, 'time_out_morning', phTimeNow);
//             return;
//           }
//         }

//         // Normal AM clock-in window (allowed_windows/shiftStartForChecks)
//         if ((workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start)) || shiftStartForChecks) {
//           const windowStartForCheck = (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || workTime?.valid_in_start || shiftStartForChecks;
//           if (computedAMEndForChecks && isWithinWindow(phTimeNow, windowStartForCheck, computedAMEndForChecks)) {
//             confirmAndSetTime('Clock in for AM', setTimeInMorning, 'time_in_morning', phTimeNow);
//             return;
//           } else {
//             // late behavior within 60 minutes
//             const lateBase = canonicalStart || modalStart || windowStartForCheck;
//             const startDTModal = lateBase ? getDateForTimeStr(phTimeNow, lateBase) : null;
//             const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;
//             if (lateDeltaMinutes > 0 && lateDeltaMinutes < 60) {
//               Swal.fire({
//                 icon: 'warning',
//                 title: 'Outside allowed time',
//                 html: `<p>Your clock-in is outside the allowed window.</p>
//                        <p><strong>${amLabel}:</strong> ${canonicalStart ? friendlyWindowLabel(canonicalStart, addMinutesToTimeStr(canonicalStart, 60)) : (modalStart ? friendlyWindowLabel(modalStart, modalComputedEnd) : '—')}</p>
//                        <p>You are ${lateDeltaMinutes} minute(s) late. Do you want to send a late/adjustment request instead?</p>`,
//                 showCancelButton: true,
//                 confirmButtonText: 'Send Adjustment Request',
//                 cancelButtonText: 'Cancel'
//               }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//               return;
//             } else {
//               Swal.fire({
//                 icon: 'warning',
//                 title: 'Outside allowed time',
//                 html: `<p>Your clock-in is outside the allowed window.</p>
//                        <p><strong>${amLabel}:</strong> ${canonicalStart ? friendlyWindowLabel(canonicalStart, addMinutesToTimeStr(canonicalStart, 60)) : (modalStart ? friendlyWindowLabel(modalStart, modalComputedEnd) : '—')}</p>
//                        <p>Do you want to send a late/adjustment request instead?</p>`,
//                 showCancelButton: true,
//                 confirmButtonText: 'Send Adjustment Request',
//                 cancelButtonText: 'Cancel'
//               }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//               return;
//             }
//           }
//         } else {
//           sendLateRequest();
//           return;
//         }
//       } else if (!timeOutMorning) {
//         // Clocking out for AM: check shift-split break out or normal AM out
//         if (activeSplit && inBreakOutWindow(phTimeNow, activeSplit)) {
//           confirmAndSetTime(`Clock out for break (${activeSplit.break_name})`, setTimeOutMorning, 'time_out_morning', phTimeNow);
//           return;
//         }

//         if (win && isWithinWindow(phTimeNow, win.valid_out_start, win.valid_out_end)) {
//           confirmAndSetTime('Clock out for AM', setTimeOutMorning, 'time_out_morning', phTimeNow);
//         } else {
//           const allowedText = win ? friendlyWindowLabel(win.valid_out_start, win.valid_out_end) : '—';
//           Swal.fire({
//             icon: 'warning',
//             title: 'Outside allowed time',
//             html: `<p>Your clock-out is outside the allowed window.</p>
//                    <p><strong>Allowed Clock-out (AM):</strong> ${allowedText}</p>
//                    <p>Send a late/adjustment request?</p>`,
//             showCancelButton: true,
//             confirmButtonText: 'Send Adjustment Request'
//           }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//         }
//       } else {
//         setAmPmMode('PM');
//       }
//     } else {
//       // PM logic for split-shift (unchanged semantics) — time in/out based on break valid_break_in/valid_break_out and work_time valid_out
//       // PM logic for split-shift (improved — prefer break's valid_break_in window, with +1h extension)
// if (!timeInAfternoon) {
//   // find the canonical shift-split break (if any)
//   const splitBreak = getBreaks().find(x => Number(x.is_shift_split) === 1) || null;

//   // prefer computed fields, then valid_*, then derived from break_start
//   const breakPmStart = splitBreak ? (splitBreak.computed_valid_break_in_start || splitBreak.valid_break_in_start || addMinutesToTimeStr(splitBreak.break_start, 30)) : null;
//   const breakPmEnd   = splitBreak ? (splitBreak.computed_valid_break_in_end   || splitBreak.valid_break_in_end   || splitBreak.break_end) : null;

//   // extension: allow 1 hour after breakPmEnd
//   const breakPmEndExtended = breakPmEnd ? addMinutesToTimeStr(breakPmEnd, 60) : null;

//   // fallback: allowed_windows / workTime valid_in if no split break
//   const fallbackPmStart = (workTime && (workTime.valid_in_start || (workTime.allowed_windows && workTime.allowed_windows.valid_in_start))) || null;
//   const fallbackPmEnd   = (workTime && (workTime.valid_in_end   || (workTime.allowed_windows && workTime.allowed_windows.valid_in_end)))   || (fallbackPmStart ? addMinutesToTimeStr(fallbackPmStart, 60) : null);

//   console.log('[pm] splitBreak present?', !!splitBreak, 'breakPm:', breakPmStart, breakPmEnd, 'breakPmExtendedEnd:', breakPmEndExtended, 'fallbackPm:', fallbackPmStart, fallbackPmEnd);

//   // 1) If a split break is defined and the user is inside its break-in window -> allow PM clock-in
//   if (breakPmStart && breakPmEnd && isWithinWindow(phTimeNow, breakPmStart, breakPmEnd)) {
//     console.log('[pm] inside break-in window -> allow PM clock-in');
//     confirmAndSetTime(`Clock in for PM (post-break)`, setTimeInAfternoon, 'time_in_afternoon', phTimeNow);
//     return;
//   }

//   // 1b) If inside the 1-hour extension after break end -> allow PM clock-in but label as within extension
//   if (breakPmStart && breakPmEndExtended && isWithinWindow(phTimeNow, breakPmEnd, breakPmEndExtended)) {
//     console.log('[pm] inside 1h extension after break end -> allow PM clock-in (within extension)');
//     confirmAndSetTime(`Clock in for PM (post-break — within 1h extension)`, setTimeInAfternoon, 'time_in_afternoon', phTimeNow);
//     return;
//   }

//   // 2) If split break exists but not in window/extension -> apply late/adjustment behavior similar to AM
//   if (splitBreak) {
//     // If user already clocked out for morning (i.e. took the break), compute lateness relative to canonical start_time
//     if (timeOutMorning && !timeInAfternoon) {
//       const canonicalStart = workTime?.start_time || workTime?.valid_in_start || (workTime?.allowed_windows && workTime.allowed_windows.valid_in_start) || fallbackPmStart || null;
//       const startDTModal = canonicalStart ? getDateForTimeStr(phTimeNow, canonicalStart) : null;
//       const lateDeltaMinutes = startDTModal ? Math.floor((phTimeNow.getTime() - startDTModal.getTime()) / 60000) : null;

//       // if within grace (0 < late < 60): show small-late dialog offering adjustment
//       if (lateDeltaMinutes !== null && lateDeltaMinutes > 0 && lateDeltaMinutes < 60) {
//         const allowedText = (breakPmStart && breakPmEnd) ? friendlyWindowLabel(breakPmStart, breakPmEnd) : (fallbackPmStart && fallbackPmEnd ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—');
//         Swal.fire({
//           icon: 'warning',
//           title: 'Outside allowed time',
//           html: `<p>Your clock-in is outside the allowed window.</p>
//                  <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
//                  <p>You are ${lateDeltaMinutes} minute(s) late. Do you want to send a late/adjustment request instead?</p>`,
//           showCancelButton: true,
//           confirmButtonText: 'Send Adjustment Request',
//           cancelButtonText: 'Cancel'
//         }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//         return;
//       }

//       // if >= 60 minutes late -> offer adjustment request
//       if (lateDeltaMinutes !== null && lateDeltaMinutes >= 60) {
//         const allowedText = (breakPmStart && breakPmEnd) ? friendlyWindowLabel(breakPmStart, breakPmEnd) : (fallbackPmStart && fallbackPmEnd ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—');
//         Swal.fire({
//           icon: 'warning',
//           title: 'Outside allowed time',
//           html: `<p>Your clock-in is outside the allowed window.</p>
//                  ${lateDeltaMinutes !== null ? `<p>You are ${lateDeltaMinutes} minute(s) late.</p>` : ''}
//                  <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
//                  <p>Do you want to send a late/adjustment request instead?</p>`,
//           showCancelButton: true,
//           confirmButtonText: 'Send Adjustment Request',
//           cancelButtonText: 'Cancel'
//         }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//         return;
//       }

//       // else (no canonical start to compare or no lateness) fallback to "outside allowed" UI
//       const allowedText = (breakPmStart && breakPmEnd) ? friendlyWindowLabel(breakPmStart, breakPmEnd) : (fallbackPmStart && fallbackPmEnd ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—');
//       Swal.fire({
//         icon: 'warning',
//         title: 'Outside allowed time',
//         html: `<p>Your clock-in is outside the allowed window.</p>
//                <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
//                <p>Send a late/adjustment request?</p>`,
//         showCancelButton: true,
//         confirmButtonText: 'Send Adjustment Request'
//       }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//       return;
//     }

//     // If user hasn't clocked out for morning, we shouldn't allow PM clock-in — show standard UI
//     const allowedText = (breakPmStart && breakPmEnd) ? friendlyWindowLabel(breakPmStart, breakPmEnd) : (fallbackPmStart && fallbackPmEnd ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—');
//     Swal.fire({
//       icon: 'warning',
//       title: 'Outside allowed time',
//       html: `<p>Your clock-in is outside the allowed window.</p>
//              <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
//              <p>Send a late/adjustment request?</p>`,
//       showCancelButton: true,
//       confirmButtonText: 'Send Adjustment Request'
//     }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//     return;
//   }

//   // 3) No split break configured: fallback to allowed_windows (existing behaviour)
//   if (fallbackPmStart && fallbackPmEnd && isWithinWindow(phTimeNow, fallbackPmStart, fallbackPmEnd)) {
//     confirmAndSetTime('Clock in for PM', setTimeInAfternoon, 'time_in_afternoon', phTimeNow);
//     return;
//   }

//   const allowedText = (fallbackPmStart && fallbackPmEnd) ? friendlyWindowLabel(fallbackPmStart, fallbackPmEnd) : '—';
//   Swal.fire({
//     icon: 'warning',
//     title: 'Outside allowed time',
//     html: `<p>Your clock-in is outside the allowed window.</p>
//            <p><strong>Allowed Clock-in (PM):</strong> ${allowedText}</p>
//            <p>Send a late/adjustment request?</p>`,
//     showCancelButton: true,
//     confirmButtonText: 'Send Adjustment Request'
//   }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//   return;
// }
//  else if (!timeOutAfternoon) {
//         if (win && isWithinWindow(phTimeNow, win.valid_out_start, win.valid_out_end)) {
//           confirmAndSetTime('Clock out for PM', setTimeOutAfternoon, 'time_out_afternoon', phTimeNow);
//         } else {
//           const allowedText = win ? friendlyWindowLabel(win.valid_out_start, win.valid_out_end) : '—';
//           Swal.fire({
//             icon: 'warning',
//             title: 'Outside allowed time',
//             html: `<p>Your clock-out is outside the allowed window.</p>
//                    <p><strong>Allowed Clock-out (PM):</strong> ${allowedText}</p>
//                    <p>Send a late/adjustment request?</p>`,
//             showCancelButton: true,
//             confirmButtonText: 'Send Adjustment Request'
//           }).then((res) => { if (res.isConfirmed) navigate('/employee/late-request', { state: { employeeId, employeeName } }); });
//         }
//       } else {
//         Swal.fire('Info', 'You have already clocked in and out for PM.', 'info');
//       }
//     }
//   };

//   // ---------- Render ----------
//   const buttonLabel = computeButtonLabel();
//   const buttonSub = computeButtonSubLabel();

//   return (
//     <div className="bg-[#f3f3f3] rounded-md drop-shadow-md w-full lg:w-[25rem]">
//       <div className="flex items-center justify-start w-full gap-2 p-2 text-sm font-medium text-black">
//         <span>{currentDate}</span>
//         <span>|</span>
//         <span>{currentTime}</span>
//       </div>

//       {/* schedule display */}
//       <div className="w-full p-2 border-t border-b border-gray-200">
//         {scheduleLoading ? (
//           <div className="text-xs text-gray-600">Loading…</div>
//         ) : (scheduleFound || defaultUsed) ? (
//           <div className="flex flex-col gap-2">
//             <div className="flex items-start justify-between">
//               <div className="flex flex-col">
//                 <div className="flex items-center gap-2">
//                   <div className="text-sm font-medium leading-tight text-gray-800">
//                     {scheduleFound ? 'Scheduled' : 'Default shift'}
//                   </div>
//                   <RecurrenceBadge rec={schedule?.recurrence_type || (defaultUsed ? 'daily' : null)} />
//                   {defaultUsed && (
//                     <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-yellow-50 text-yellow-800">
//                       Default
//                     </span>
//                   )}
//                 </div>

//                 <div className="mt-1 text-xs text-gray-600">
//                   {workTime?.shift_name
//                     ? `${workTime.shift_name} ${workTime?.shift_code ? `• ${workTime.shift_code}` : ''}`
//                     : `Work Time ID ${schedule?.work_time_id ?? workTime?.id ?? '—'}`}
//                 </div>

//                 <div className="flex flex-row gap-1 mt-2">
//                   <DaysChips days={schedule?.days_of_week || workTime?.days_of_week} />
//                   <div className="text-[11px] text-gray-500 flex gap-2 items-center">
//                     <LucideCalendar className="w-3.5 h-3.5 text-gray-400" />
//                     <span>Effective: {formatDateFriendly(schedule?.effective_date || workTime?.effective_date || selectedDate)}</span>
//                     {schedule?.end_date && <span>• Ends: {formatDateFriendly(schedule.end_date)}</span>}
//                   </div>
//                 </div>
//               </div>

//               <div className="text-right">
//                 {/* optional display of shift times */}
//               </div>
//             </div>

//             {scheduleFound && schedule?.recurrence_type === 'weekly' && schedule?.days_of_week && (
//               <div className="text-[11px] text-gray-500">Repeats weekly on: {schedule.days_of_week}</div>
//             )}
//           </div>
//         ) : (
//           <div className="text-xs text-gray-500">No schedule set for this date</div>
//         )}

//         {scheduleError && <div className="mt-1 text-xs text-red-500">Schedule error: {scheduleError}</div>}
//       </div>

//       {/* attendance summary */}
//       <div className="flex flex-row justify-around w-full p-2">
//         <div className="flex flex-row justify-around w-full">
//           <span className="text-xs text-center text-gray-500">Time In:</span>
//           <div className="text-xs text-center text-gray-500 rounded ">
//             {amPmMode === 'AM'
//               ? to12HourFormat(timeInMorning) || '-'
//               : to12HourFormat(timeInAfternoon) || '-'}
//           </div>
//         </div>

//         <div className="w-px mx-2 bg-gray-300" />

//         <div className="flex flex-row justify-around w-full">
//           <span className="text-xs text-center text-gray-500">Time Out:</span>
//           <div className="text-xs text-center text-gray-500 rounded ">
//             {amPmMode === 'AM'
//               ? to12HourFormat(timeOutMorning) || '-'
//               : to12HourFormat(timeOutAfternoon) || '-'}
//           </div>
//         </div>
//       </div>

//       <button
//         onClick={handleClick}
//         disabled={isLoading || !phNow}
//         className={`w-full mt-2 py-2 rounded text-white ${
//           phNow && !isLoading ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
//         }`}
//         title={buttonSub || undefined}
//         aria-label={buttonLabel}
//       >
//         <div className="flex flex-col items-center">
//           <span>{buttonLabel}</span>
//           {buttonSub && <small className="text-[11px] opacity-80">{buttonSub}</small>}
//         </div>
//       </button>
//     </div>
//   );
// };

// export default TimeInOut;

