// components/ScheduleGrid.jsx
import React from "react";
import PropTypes from "prop-types";
import { fmtHeader, isSunday, colorForId } from "../utils/scheduleUtils";

export default function ScheduleGrid({ groups, dates, workTimes, onCellClick, LABEL_MAX_WIDTH }) {
  const getEmployeeScheduleOnDate = (employee, date) => {
    if (!employee?.schedules) return null;
    return employee.schedules[date] || null;
  };

  const renderSubmissionBadge = (emp, date) => {
    const pending = emp?.pending_submissions?.[date];
    if (!pending) return null;
    const status = (pending.status || "").toLowerCase();
    let bg = "bg-yellow-400";
    if (status === "lvl1_approved") bg = "bg-blue-500";
    else if (status === "lvl2_approved" || status === "applied") bg = "bg-green-600";
    else if (status === "rejected") bg = "bg-red-500";

    return (
      <div
        title={`${status} (submission ${pending.submission_id || ""})`}
        className={`absolute top-1 right-1 w-3 h-3 rounded-full ${bg} ring-1 ring-white`}
      />
    );
  };

  return (
    <div className="overflow-auto border rounded-md">
      <div className="inline-grid" style={{ gridTemplateColumns: `300px repeat(${dates.length}, 160px)` }}>
        {/* Top-left corner sticky cell */}
        <div className="sticky top-0 left-0 z-30 p-2 font-semibold bg-gray-50 border-b border-r">
          Employee
        </div>

        {/* Header Row: Dates */}
        {dates.map((d) => (
          <div
            key={d}
            className={`sticky top-0 z-20 p-2 text-center font-medium border-b border-r ${
              isSunday(d) ? "bg-red-50 text-red-700" : "bg-gray-50"
            }`}
          >
            {fmtHeader(d)}
          </div>
        ))}

        {/* Employee + Schedule Rows */}
        {groups.flatMap((group) =>
          group.employees.map((emp) => {
            return (
              <React.Fragment key={emp.employee_id}>
                {/* Sticky Left Column: Employee info */}
                <div className="sticky left-0 z-10 p-3 bg-white border-b border-r">
                  <div className="font-medium truncate">{emp.first_name} {emp.last_name}</div>
                  <div className="text-xs text-gray-500">
                    {group.position_name} • {group.department_name}
                  </div>
                </div>

                {/* Schedule Cells */}
                {dates.map((d) => {
                  const sched = getEmployeeScheduleOnDate(emp, d);
                  const pending = emp?.pending_submissions?.[d];
                  const leave = (!pending) ? emp?.approved_leaves?.[d] : null;

                  let proposedShift = null;
                  if (pending) {
                    if (pending.work_time_id === null || pending.work_time_id === "") {
                      proposedShift = { shift_name: "— Clear —", __clear: true };
                    } else {
                      const wt = workTimes.find(
                        (w) => String(w.id ?? w.work_time_id) === String(pending.work_time_id)
                      );
                      proposedShift = wt ? { ...wt } : { shift_name: (pending.shift_name || "Pending shift"), id: pending.work_time_id };
                    }
                  }

                  let label, title;
                  if (proposedShift) {
                    label = `${proposedShift.shift_name}`;
                    title = `${proposedShift.shift_name}`;
                  } else if (leave) {
                    const typeName = leave.leave_type_name || `Type ${leave.leave_type_id}`;
                    label = `On Leave: ${typeName}`;
                    title = `${typeName} • ${leave.date_from} → ${leave.date_until} • ${leave.total_days} day(s)`;
                  } else {
                    label = sched?.shift_name || "-";
                    title = sched ? `${sched.shift_name} ${sched.start_time || ""}-${sched.end_time || ""}` : "No shift";
                  }

                  let bgColor = null;
                  if (proposedShift) {
                    bgColor = proposedShift.__clear ? "#f8fafc" : colorForId(proposedShift.id ?? proposedShift.work_time_id ?? pending.work_time_id);
                  } else if (leave) {
                    bgColor = "#fef3c7";
                  } else if (sched) {
                    bgColor = colorForId(sched.work_time_id);
                  }

                  const classNames = [
                    "p-2 border-b border-r text-sm flex items-center justify-center cursor-pointer relative"
                  ];
                  if (bgColor && bgColor !== "#f8fafc") classNames.push("text-white");
                  else if (proposedShift && proposedShift.__clear) classNames.push("text-gray-700 italic");
                  else classNames.push(sched ? "text-white" : "text-gray-500");
                  if (leave && bgColor === "#fef3c7") {
                    classNames.splice(classNames.indexOf("text-white"), 1);
                    classNames.push("text-gray-800");
                  }

                  const baseStyle = {};
                  if (bgColor) baseStyle.backgroundColor = bgColor;
                  if (isSunday(d) && !bgColor) {
                    baseStyle.backgroundColor = "#fee2e2";
                    classNames.push("text-red-700");
                  }

                  return (
                    <div
                      key={emp.employee_id + "-" + d}
                      role="button"
                      tabIndex={0}
                      className={classNames.join(" ")}
                      style={baseStyle}
                      title={pending ? `${pending.status || "Pending"} • submission ${pending.submission_id || ""} • ${title}` : title}
                      onClick={(e) => onCellClick(e, emp, d)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCellClick(e, emp, d); } }}
                    >
                      <div className="truncate" style={{ maxWidth: `${LABEL_MAX_WIDTH}px` }}>{label}</div>
                      {renderSubmissionBadge(emp, d)}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}

ScheduleGrid.propTypes = {
  groups: PropTypes.array.isRequired,
  dates: PropTypes.array.isRequired,
  workTimes: PropTypes.array.isRequired,
  onCellClick: PropTypes.func.isRequired,
  LABEL_MAX_WIDTH: PropTypes.number,
};




// // components/ScheduleGrid.jsx
// import React from "react";
// import PropTypes from "prop-types";
// import { fmtHeader, isSunday, colorForId } from "../utils/scheduleUtils"; // adjust path if different

// // export default function ScheduleGrid({ groups, dates, branchesList, workTimes, onCellClick, LABEL_MAX_WIDTH }) {
//   export default function ScheduleGrid({ groups, dates, workTimes, onCellClick, LABEL_MAX_WIDTH }) {

//   const getEmployeeScheduleOnDate = (employee, date) => {
//     if (!employee?.schedules) return null;
//     return employee.schedules[date] || null;
//   };

//   const renderSubmissionBadge = (emp, date) => {
//     const pending = emp?.pending_submissions?.[date];
//     if (!pending) return null;
//     const status = (pending.status || "").toLowerCase();
//     let bg = "bg-yellow-400";
//     let title = "Pending approval";
//     if (status === "lvl1_approved") {
//       bg = "bg-blue-500";
//       title = "Level 1 approved";
//     } else if (status === "lvl2_approved" || status === "applied") {
//       bg = "bg-green-600";
//       title = status === "applied" ? "Shift Schedule Applied" : "Level 2 approved";
//     } else if (status === "rejected") {
//       bg = "bg-red-500";
//       title = "Rejected";
//     }
//     return <div title={`${title} (submission ${pending.submission_id || ""})`} className={`absolute top-1 right-1 w-3 h-3 rounded-full ${bg} ring-1 ring-white`} />;
//   };

//   return (
//     <div className="flex-1 overflow-auto bg-white border rounded-md">
//       <div className="sticky top-0 z-20 bg-white">
//         <div className="grid" style={{ gridTemplateColumns: `300px repeat(${dates.length}, 160px)` }}>
//           <div className="p-2 font-semibold border-b border-r bg-gray-50">Employee</div>
//           {dates.map((d) => (
//             <div key={d} className={`p-2 text-sm font-medium text-center border-b border-r ${isSunday(d) ? "bg-red-50 text-red-700" : "bg-gray-50"}`}>
//               {fmtHeader(d)}
//             </div>
//           ))}
//         </div>
//       </div>

//       <div>
//         {groups.length === 0 && <div className="p-6 text-center text-gray-500">No employees match your search or no data</div>}

//         {groups.map((group) => (
//           <div key={group.position_id ?? "no_position"} className="border-b">
//             <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b">
//               <div className="flex items-center gap-3">
//                 <div className="font-semibold">{group.position_name || "Unassigned Position"}</div>
//                 <div className="text-xs text-gray-500">({group.employees.length})</div>
//               </div>
//             </div>

//             {group.employees.map((emp) => (
//               <div key={emp.employee_id} className="relative grid items-center" style={{ gridTemplateColumns: `300px repeat(${dates.length}, 160px)` }}>
//                 <div className="sticky left-0 z-10 p-3 bg-white border-b border-r" style={{ minWidth: 300 }}>
//                   <div className="font-medium truncate">{emp.first_name} {emp.last_name}</div>
//                   <div className="text-xs text-gray-500">
//                     {group.position_name} • {group.department_name}
//                     {emp.branch_id ? (
//                       <span className="block mt-1 text-xs text-slate-600">
//                         Branch: <span className="font-medium">{emp.branch_name || (branchesList.find(b => String(b.branch_id) === String(emp.branch_id))?.name) || emp.branch_id}</span>
//                       </span>
//                     ) : (
//                       <span className="block mt-1 text-xs text-slate-600"><span className="font-medium">Unassigned</span></span>
//                     )}
//                   </div>
//                 </div>

//                 {dates.map((d) => {
//                   const sched = getEmployeeScheduleOnDate(emp, d);
//                   const has = !!sched;
//                   const pending = emp?.pending_submissions?.[d];

//                   let proposedShift = null;
//                   if (pending) {
//                     if (pending.work_time_id === null || pending.work_time_id === "") {
//                       proposedShift = { shift_name: "— Clear —", __clear: true };
//                     } else {
//                       const wt = workTimes.find((w) => String(w.id ?? w.work_time_id) === String(pending.work_time_id));
//                       proposedShift = wt ? { ...wt } : { shift_name: (pending.shift_name || "Pending shift"), id: pending.work_time_id };
//                     }
//                   }

//                   const label = proposedShift ? `${proposedShift.shift_name} ${pending ? "(pending)" : ""}` : (sched?.shift_name || "-");
//                   const title = proposedShift ? `${proposedShift.shift_name}` : (has ? `${sched.shift_name} ${sched.start_time || ""}-${sched.end_time || ""}` : "No shift");

//                   let bgColor = null;
//                   if (proposedShift) {
//                     if (proposedShift.__clear) {
//                       bgColor = "#f8fafc";
//                     } else {
//                       const pid = proposedShift.id ?? proposedShift.work_time_id ?? pending.work_time_id;
//                       bgColor = colorForId(pid);
//                     }
//                   } else if (has) {
//                     bgColor = colorForId(sched.work_time_id);
//                   }

//                   const baseStyle = {};
//                   const classNames = ["p-2", "border-b", "border-r", "text-sm", "flex", "items-center", "justify-center", "cursor-pointer", "relative"];

//                   if (bgColor && bgColor !== "#f8fafc") classNames.push("text-white");
//                   else if (proposedShift && proposedShift.__clear) classNames.push("text-gray-700", "italic");
//                   else classNames.push(has ? "text-white" : "text-gray-500");

//                   if (isSunday(d)) {
//                     if (!bgColor) {
//                       baseStyle.backgroundColor = "#fee2e2";
//                       classNames.push("text-red-700");
//                     } else {
//                       baseStyle.borderLeft = has ? "4px solid rgba(220,38,38,0.85)" : undefined;
//                     }
//                   }
//                   if (bgColor) baseStyle.backgroundColor = bgColor;

//                   return (
//                     <div
//                       key={d}
//                       role="button"
//                       tabIndex={0}
//                       className={classNames.join(" ")}
//                       style={baseStyle}
//                       title={pending ? `${pending.status || "Pending"} • submission ${pending.submission_id || ""} • ${title}` : title}
//                       onClick={(e) => onCellClick(e, emp, d)}
//                       onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCellClick(e, emp, d); } }}
//                     >
//                       <div className="truncate" style={{ maxWidth: `${LABEL_MAX_WIDTH}px` }}>{label}</div>
//                       {renderSubmissionBadge(emp, d)}
//                     </div>
//                   );
//                 })}
//               </div>
//             ))}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// ScheduleGrid.propTypes = {
//   groups: PropTypes.array.isRequired,
//   dates: PropTypes.array.isRequired,
//   // branchesList: PropTypes.array.isRequired,
//   workTimes: PropTypes.array.isRequired,
//   onCellClick: PropTypes.func.isRequired,
//   LABEL_MAX_WIDTH: PropTypes.number,
// };
