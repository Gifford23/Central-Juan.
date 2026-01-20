import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import AttendanceSummaryPrint from "./AttendanceSummaryPrint";
import { useNavigate } from "react-router-dom";

const AttendanceSummaryModal = ({
  show,
  onClose,
  selectedPayrolls = [],
  dateFrom = "",
  dateUntil = "",
}) => {
  const [attendanceMatrix, setAttendanceMatrix] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colOffsets, setColOffsets] = useState([]);
  const navigate = useNavigate();

  const leftRefs = useRef([]);

  // ---- UTILITIES ----
  const generateDateRange = (from, to) => {
    if (!from || !to) return [];
    const start = new Date(from);
    const end = new Date(to);
    if (isNaN(start) || isNaN(end) || start > end) return [];
    const out = [];
    const cur = new Date(start);
    while (cur <= end) {
      out.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  };

  const isSunday = (yyyyMmDd) => new Date(yyyyMmDd).getDay() === 0;

  const formatHeaderDate = (yyyyMmDd) => {
    if (!yyyyMmDd) return "—";
    const d = new Date(yyyyMmDd);
    if (isNaN(d)) return yyyyMmDd;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "--";
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  // ---- LOAD DATA ----
  useEffect(() => {
    if (!show) return;
    setLoading(true);

    const from =
      dateFrom ||
      selectedPayrolls?.[0]?.date_from ||
      selectedPayrolls?.[0]?.dateFrom ||
      "";
    const until =
      dateUntil ||
      selectedPayrolls?.[0]?.date_until ||
      selectedPayrolls?.[0]?.dateUntil ||
      "";

    const fullRange = generateDateRange(from, until);
    setDates(fullRange);

    const matrix = (selectedPayrolls || []).map((p) => {
      const dateMap = {};
      let empTotalLate = 0;

      (p.attendance_records || []).forEach((a) => {
        const key =
          (a.attendance_date && a.attendance_date.slice(0, 10)) ||
          a.date ||
          a.att_date;
        if (!key) return;

        // net_work_minutes from API (dynamic)
        const netMinutes = parseFloat(a.net_work_minutes || 0); // expected work minutes for the day (e.g. 480)
        const actualMinutes = parseFloat(a.actual_rendered_minutes || 0);
        const totalRendered = parseFloat(a.total_rendered_hours || 0);

        // schedule info (might be in schedule or schedule_fields)
        const sched = a.schedule || a.schedule_fields || {};
        const schedTotalMinutes = parseFloat(sched.total_minutes ?? a.total_minutes ?? 0);
        const schedStart = sched.start_time ?? a.start_time ?? "";
        const schedEnd = sched.end_time ?? a.end_time ?? "";

        // --- NEW: Rest day detection (explicit + fallback) with attendance-null guard ---
        const schedule = sched ?? {};
        const validInStart = schedule.valid_in_start ?? schedule.validInStart ?? "";
        const validInEnd = schedule.valid_in_end ?? schedule.validInEnd ?? "";

        // Primary rule: API explicitly marks valid_in_start & valid_in_end as midnight => Rest Day
        const explicitRestDay = (validInStart === "00:00:00" && validInEnd === "00:00:00");

        // Fallback heuristics for older / inconsistent payloads:
        // - total_minutes can be 0 or 1 for rest-day-like schedules
        // - start_time at midnight + tiny end_time (00:00:01 or 00:01:00 or 00:00:00) is a rest-day marker in some exports
        const totalMinutesFromSchedule = schedTotalMinutes;
        const startTime = schedStart;
        const fallbackRestDay = (
          (totalMinutesFromSchedule === 0 || totalMinutesFromSchedule === 1) &&
          (startTime === "00:00:00" || startTime === "00:00") &&
          (
            (schedule.end_time ?? schedEnd) === "00:00:01" ||
            (schedule.end_time ?? schedEnd) === "00:01:00" ||
            (schedule.end_time ?? schedEnd) === "00:00:00"
          )
        );

        // Attendance-null guard: require no recorded time-ins/outs to mark RD
        const hasNoAttendance =
          (a.time_in_morning == null || a.time_in_morning === "") &&
          (a.time_out_morning == null || a.time_out_morning === "") &&
          (a.time_in_afternoon == null || a.time_in_afternoon === "") &&
          (a.time_out_afternoon == null || a.time_out_afternoon === "");

        const isRestDay = hasNoAttendance && (explicitRestDay || fallbackRestDay);
        // --- end rest-day detection ---

        // Absent detection: based on net_work_minutes (dynamic) and no actual minutes
        const isAbsent = !isRestDay && netMinutes > 0 && actualMinutes === 0;

        // lateHours calculation:
        // - if absent: count as netMinutes / 60 (the expected hours)
        // - otherwise: if actualMinutes === 0 -> netMinutes/60 (full late)
        //   else late = (netMinutes - actualMinutes) / 60 (could be 0 or positive)
        let lateHours = 0;
        if (isAbsent) {
          lateHours = netMinutes / 60;
        } else if (actualMinutes === 0) {
          lateHours = netMinutes / 60;
        } else {
          lateHours = (netMinutes - actualMinutes) / 60;
          // if negative (worked more than net), clamp to 0 (no negative lateness)
          if (lateHours < 0) lateHours = 0;
        }

        // accumulate employee-level late
        empTotalLate += lateHours;

        const rec = {
          isRestDay,
          isAbsent,
          isPerfect: !isAbsent && lateHours === 0,
          time_in_morning: a.time_in_morning || "",
          time_out_morning: a.time_out_morning || "",
          time_in_afternoon: a.time_in_afternoon || "",
          time_out_afternoon: a.time_out_afternoon || "",
          days_credited: a.days_credited || "0.00",
          total_rendered_hours: (isRestDay ? 0 : totalRendered).toFixed(2),
          late_hours: lateHours.toFixed(2),
          overtime_hours: a.overtime_request || "0.00",
        };

        dateMap[key] = rec;
      });

      const totalDays = (p.attendance_records || []).reduce(
        (s, a) => s + parseFloat(a.days_credited || 0),
        0
      );
      const totalHours = (p.attendance_records || []).reduce(
        (s, a) => s + parseFloat(a.total_rendered_hours || 0),
        0
      );

      return {
        employee_name: p.name || p.employee_name || `${p.employee_id || "—"}`,
        employee_id: p.employee_id || p.id || "",
        dateMap,
        isPerfect: empTotalLate === 0,
        totals: {
          days: totalDays.toFixed(2),
          hours: totalHours.toFixed(2),
          overtime: Number(
            p.final_overtime_hours || p.total_overtime_hours || 0
          ).toFixed(2),
          late: empTotalLate.toFixed(2),
        },
      };
    });

    setAttendanceMatrix(matrix);
    setLoading(false);
  }, [show, selectedPayrolls, dateFrom, dateUntil]);

  // ---- DYNAMIC STICKY CALC ----
  useLayoutEffect(() => {
    if (!leftRefs.current.length) return;
    const offsets = [];
    let total = 0;
    leftRefs.current.forEach((ref) => {
      if (ref) {
        offsets.push(total);
        total += ref.offsetWidth;
      }
    });
    setColOffsets(offsets);
  }, [attendanceMatrix, dates, show]);

  const goToAttendanceSummary = () => {
    navigate("/attendance-summary"); // route where AttendanceSummaryPrint is rendered
  };

  // ---- RENDER ----
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex justify-center items-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-[95%] max-w-[95vw] p-6 max-h-[90vh] flex flex-col"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
          >
            <div className="flex justify-between items-center mb-6 border-b pb-3 shrink-0">
              <h2 className="text-2xl font-semibold text-gray-800">
                🗓 Attendance Summary (Matrix View)
              </h2>

              {/* <AttendanceSummaryPrint
                selectedPayrolls={selectedPayrolls}
                dateFrom={dateFrom}
                dateUntil={dateUntil}
              /> */}
              <button
                onClick={goToAttendanceSummary}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Go to Attendance Summary
              </button>
              <button
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <p className="text-gray-600 mb-4 shrink-0">
              Period:{" "}
              <b>
                {new Date(dateFrom).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </b>{" "}
              —{" "}
              <b>
                {new Date(dateUntil).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </b>
            </p>

            {loading ? (
              <div className="flex justify-center py-10 grow">
                <p className="text-gray-500 text-lg animate-pulse">
                  Preparing attendance...
                </p>
              </div>
            ) : attendanceMatrix.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-lg grow">
                No attendance records found for this period.
              </div>
            ) : (
              <div className="relative w-full grow overflow-auto">
                <div className="overflow-auto w-full max-h-[65vh]">
                  <table className="border-collapse text-sm min-w-max">
                    <thead className="sticky top-0 z-40">
                      <tr>
                        <th
                          ref={(el) => (leftRefs.current[0] = el)}
                          className="px-10 py-2 text-left sticky bg-indigo-600 text-white shadow-sm border-b border-indigo-700"
                          style={{
                            left: `${colOffsets[0] || 0}px`,
                            zIndex: 60,
                            whiteSpace: "nowrap",
                            background: "#4f46e5",
                          }}
                        >
                          Employee
                        </th>

                        {dates.map((date) => {
                          const sunday = isSunday(date);
                          return (
                            <th
                              key={date}
                              className={`px-10 py-2 text-center min-w-[210px] ${
                                sunday ? "bg-red-100 text-red-800" : "text-white"
                              }`}
                              style={{
                                backgroundColor: sunday ? "" : "#4f46e5",
                                position: "sticky",
                                top: 0,
                                zIndex: 20,
                              }}
                            >
                              {formatHeaderDate(date)}
                            </th>
                          );
                        })}

                        {["Total Days", "Total Hours", "Overtime", "Late/Absent (hrs)"].map(
                          (label, i) => (
                            <th
                              key={i}
                              className="px-3 py-2 text-center min-w-[120px] text-white"
                              style={{
                                backgroundColor: "#4f46e5",
                                position: "sticky",
                                top: 0,
                                zIndex: 20,
                              }}
                            >
                              {label}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {attendanceMatrix.map((emp, idx) => (
                        <tr
                          key={idx}
                          className={`border-t transition ${
                            emp.isPerfect
                              ? "bg-green-100 hover:bg-green-200"
                              : idx % 2 === 0
                              ? "bg-white hover:bg-indigo-50"
                              : "bg-gray-50 hover:bg-indigo-50"
                          }`}
                        >
                          <td
                            className={`px-4 py-2 sticky border-r align-top`}
                            style={{
                              left: `${colOffsets[0] || 0}px`,
                              zIndex: 30,
                              boxShadow: "4px 0 6px rgba(0,0,0,0.04)",
                              whiteSpace: "nowrap",
                              minWidth: "220px",
                              background: emp.isPerfect ? "#dcfce7" : idx % 2 === 0 ? "#fff" : "#f9fafb",
                            }}
                          >
                            <div>
                              <div className="font-medium text-gray-800">
                                {emp.employee_name || "—"}
                              </div>
                              <div className="text-gray-600 text-sm">
                                {emp.employee_id || "—"}
                              </div>
                            </div>
                          </td>

                          {dates.map((date) => {
                            const rec = emp.dateMap[date];
                            const sunday = isSunday(date);
                            return (
                              <td
                                key={date}
                                className={`px-3 py-2 text-center align-top min-w-[210px] ${
                                  sunday ? "bg-red-50" : ""
                                }`}
                              >
                                {rec ? (
                                  rec.isRestDay ? (
                                    <div className="px-13 border rounded-lg p-2 text-lg font-bold text-gray-500 bg-yellow-100">
                                      Rest Day
                                    </div>
                                  ) : (
                                    <div
                                      className={`border border-gray-200 rounded-lg shadow-sm p-2 text-xs text-gray-700 w-49 mx-auto ${
                                        rec.isAbsent ? "bg-red-50" : rec.isPerfect ? "bg-green-100" : ""
                                      }`}
                                    >
                                      <div className="border-b border-indigo-300 pb-1 mb-1 text-indigo-700 font-semibold text-[14px]">
                                        {rec.isAbsent ? (
                                          <span className="text-red-600 font-bold">Absent</span>
                                        ) : (
                                          <>
                                            Rendered Day{" "}
                                          </>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-2 gap-x-1 text-[11px] leading-4">
                                        <div>
                                          <b>AM In:</b>{" "}
                                          {formatTime(rec.time_in_morning)}
                                        </div>
                                        <div>
                                          <b>AM Out:</b>{" "}
                                          {formatTime(rec.time_out_morning)}
                                        </div>
                                        <div>
                                          <b>PM In:</b>{" "}
                                          {formatTime(rec.time_in_afternoon)}
                                        </div>
                                        <div>
                                          <b>PM Out:</b>{" "}
                                          {formatTime(rec.time_out_afternoon)}
                                        </div>
                                      </div>

                                      <div className="border-t border-gray-200 mt-2 pt-1 text-[11px] leading-4">
                                        <div>
                                          <b>Rendered:</b>{" "}
                                          {rec.total_rendered_hours || "0.00"} hrs.
                                        </div>
                                        <div>
                                          <b>Overtime:</b>{" "}
                                          {rec.overtime_hours || "0.00"} hrs.
                                        </div>
                                        <div>
                                          <b>Late/Absent:</b>{" "}
                                          <span className="text-red-600 font-semibold">
                                            {rec.late_hours || "0.00"}
                                          </span>{" "}
                                          hrs.
                                        </div>
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <div className="border rounded-lg p-2 text-xs text-gray-400 italic w-49 mx-auto bg-gray-50">
                                    No attendance
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {["days", "hours", "overtime", "late"].map((k, i) => (
                            <td
                              key={i}
                              className={`px-3 py-2 text-center font-semibold min-w-[120px] ${
                                k === "late" ? "text-red-600" : "text-indigo-700"
                              }`}
                            >
                              {emp.totals[k]}
                            </td>
                          ))}
                        </tr>
                      ))}

                      <tr className="bg-indigo-100 font-semibold text-indigo-800 border-t-2">
                        <td
                          className="px-4 py-2 text-left sticky border-r"
                          style={{
                            left: colOffsets[0] || 0,
                            zIndex: 30,
                            background: "#e0e7ff",
                          }}
                        >
                          TOTAL
                        </td>

                        {dates.map((_, i) => (
                          <td key={i} className="px-16 py-2 text-center"></td>
                        ))}

                        {["days", "hours", "overtime", "late"].map((k, i) => {
                          const total = attendanceMatrix.reduce(
                            (sum, emp) => sum + parseFloat(emp.totals[k] || 0),
                            0
                          );
                          return (
                            <td
                              key={i}
                              className="px-10 py-2 text-center min-w-[120px]"
                            >
                              {total.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AttendanceSummaryModal;
