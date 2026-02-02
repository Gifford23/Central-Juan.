// TableAmPm.jsx
import React from "react";
import { format, eachDayOfInterval, parseISO, isSunday } from "date-fns";

const TableAmPm = ({ dtrData = [], dateFrom, dateUntil }) => {
  if (!dateFrom || !dateUntil) {
    return (
      <div
        style={{
          width: "100%",
          padding: 12,
          textAlign: "center",
          color: "#dc2626",
          fontWeight: 700,
        }}
      >
        Missing date range — cannot render DTR.
      </div>
    );
  }

  let allDates = [];
  try {
    allDates = eachDayOfInterval({
      start: parseISO(dateFrom),
      end: parseISO(dateUntil),
    });
  } catch (error) {
    console.error("Invalid date range:", error);
    return (
      <div
        style={{
          width: "100%",
          padding: 12,
          textAlign: "center",
          color: "#dc2626",
          fontWeight: 700,
        }}
      >
        Invalid date range
      </div>
    );
  }

  const dtrMap = (dtrData || []).reduce((acc, record) => {
    const raw =
      record?.date || record?.attendance_date || record?.attendanceDate;
    if (!raw) return acc;
    try {
      const normalized = format(parseISO(String(raw)), "yyyy-MM-dd");
      acc[normalized] = record;
    } catch (e) {}
    return acc;
  }, {});

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === "00:00:00" || String(timeStr).trim() === "-")
      return "-";
    const parts = String(timeStr)
      .split(":")
      .map((p) => p.trim());
    if (parts.length < 2) return timeStr;
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return timeStr;
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    try {
      return format(d, "h:mm a");
    } catch {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  };

  const fmtDateShort = (d) => {
    try {
      return format(d, "MMM dd");
    } catch {
      return "";
    }
  };
  const fmtDayName = (d) => {
    try {
      return format(d, "EEE");
    } catch {
      return "";
    }
  };

  const containerStyle = {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: "#fff",
    borderRadius: 10,
    border: "1px solid #e6e6e6",
    overflow: "hidden",
  };

  const desktopRowStyle = {
    display: "grid",
    gridTemplateColumns: "160px 1fr 1fr 96px 100px", // ✅ Added new col for total rendered hours
    gap: 12,
    alignItems: "center",
    padding: "8px 12px",
    borderBottom: "1px solid #f1f1f1",
    boxSizing: "border-box",
    fontSize: 13,
  };

  const headerStyle = {
    display: "grid",
    gridTemplateColumns: "160px 1fr 1fr 96px 100px", // ✅ Added header col
    gap: 12,
    padding: "8px 12px",
    fontWeight: 700,
    color: "#374151",
    fontSize: 13,
    borderBottom: "1px solid #f1f1f1",
  };

  // ✅ Compute total rendered hours sum across all records
  const totalRenderedSum = dtrData.reduce((sum, r) => {
    const hrs = parseFloat(r?.total_rendered_hours || 0);
    return sum + (isNaN(hrs) ? 0 : hrs);
  }, 0);

  return (
    <div style={containerStyle} aria-live="polite">
      {/* Desktop header + rows */}
      <div className="desktop-wrapper" style={{ display: "none" }}>
        <div style={headerStyle}>
          <div>Date</div>
          <div style={{ textAlign: "center" }}>AM</div>
          <div style={{ textAlign: "center" }}>PM</div>
          <div style={{ textAlign: "right" }}>Credit</div>
          {/* ✅ New header column */}
          <div style={{ textAlign: "right" }}>Rendered (hrs)</div>
        </div>

        {allDates.map((currentDate, i) => {
          const dateKey = format(currentDate, "yyyy-MM-dd");
          const rec = dtrMap[dateKey];
          const sunday = isSunday(currentDate);
          const rowBg = sunday
            ? { background: "#FFF1F2" }
            : i % 2 === 0
              ? { background: "#fff" }
              : { background: "#fbfcfd" };

          return (
            <div key={dateKey} style={{ ...desktopRowStyle, ...rowBg }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {fmtDateShort(currentDate)}
                </div>
                <div style={{ color: "#6b7280", marginTop: 4, fontSize: 12 }}>
                  {fmtDayName(currentDate)}
                </div>
              </div>

              {sunday ? (
                <div
                  style={{
                    gridColumn: "2 / span 2",
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#b91c1c",
                  }}
                >
                  Sunday
                </div>
              ) : rec ? (
                <>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>In</div>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>
                      {formatTime(rec.am_in)}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}
                    >
                      Out
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>
                      {formatTime(rec.am_out)}
                    </div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>In</div>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>
                      {formatTime(rec.pm_in)}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}
                    >
                      Out
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 6 }}>
                      {formatTime(rec.pm_out)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: "center", color: "#6b7280" }}>-</div>
                  <div style={{ textAlign: "center", color: "#6b7280" }}>-</div>
                </>
              )}

              <div
                style={{
                  textAlign: "right",
                  fontWeight: 800,
                  color: rec ? "#4f46e5" : "#6b7280",
                }}
              >
                {rec ? (rec.total_credit ?? "0.00") : "0.00"}
              </div>

              {/* ✅ New column for total_rendered_hours */}
              <div
                style={{
                  textAlign: "right",
                  color: rec ? "#111827" : "#6b7280",
                  fontWeight: 600,
                }}
              >
                {rec ? (rec.total_rendered_hours ?? "0.00") : "0.00"}
              </div>
            </div>
          );
        })}

        {/* ✅ Summary row for total rendered hours */}
        <div
          style={{ ...desktopRowStyle, background: "#f9fafb", fontWeight: 700 }}
        >
          <div
            style={{
              gridColumn: "1 / span 4",
              textAlign: "right",
              paddingRight: 12,
            }}
          >
            Total Rendered Hours:
          </div>
          <div style={{ textAlign: "right", color: "#4f46e5" }}>
            {totalRenderedSum.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Mobile stacked list */}
      <div className="mobile-list" style={{ padding: 10 }}>
        {allDates.map((currentDate) => {
          const dateKey = format(currentDate, "yyyy-MM-dd");
          const rec = dtrMap[dateKey];
          const sunday = isSunday(currentDate);

          return (
            <article
              key={dateKey}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 12,
                borderRadius: 8,
                background: sunday ? "#FFF1F2" : "#fff",
                border: sunday
                  ? "1px solid rgba(239,68,68,0.06)"
                  : "1px solid rgba(0,0,0,0.03)",
                marginBottom: 10,
                boxSizing: "border-box",
                fontSize: 13,
              }}
              aria-labelledby={`dtr-${dateKey}-label`}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div id={`dtr-${dateKey}-label`} style={{ fontWeight: 700 }}>
                    {fmtDateShort(currentDate)}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                    {fmtDayName(currentDate)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Credit</div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: rec ? "#4f46e5" : "#6b7280",
                      marginTop: 4,
                    }}
                  >
                    {rec ? (rec.total_credit ?? "0.00") : "0.00"}
                  </div>
                  {/* ✅ Show rendered hours on mobile */}
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    Rendered
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: rec ? "#111827" : "#6b7280",
                    }}
                  >
                    {rec ? (rec.total_rendered_hours ?? "0.00") : "0.00"}
                  </div>
                </div>
              </div>

              {sunday ? (
                <div
                  style={{ marginTop: 4, fontWeight: 700, color: "#b91c1c" }}
                >
                  Sunday — 0.00
                </div>
              ) : rec ? (
                <div
                  style={{
                    marginTop: 4,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>AM</div>
                    <div style={{ marginTop: 6 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#6b7280" }}>In</div>
                        <div style={{ fontWeight: 600 }}>
                          {formatTime(rec.am_in)}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginTop: 6,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          Out
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          {formatTime(rec.am_out)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        textAlign: "right",
                      }}
                    >
                      PM
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#6b7280" }}>In</div>
                        <div style={{ fontWeight: 600 }}>
                          {formatTime(rec.pm_in)}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          justifyContent: "flex-end",
                          marginTop: 6,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          Out
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          {formatTime(rec.pm_out)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 4, color: "#6b7280" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <div>AM</div>
                    <div>-</div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <div>PM</div>
                    <div>-</div>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {/* ✅ Mobile total summary */}
        <div
          style={{
            padding: 12,
            fontWeight: 700,
            textAlign: "right",
            borderTop: "1px solid #e5e7eb",
            color: "#4f46e5",
          }}
        >
          Total Rendered Hours: {totalRenderedSum.toFixed(2)}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-list { display: none !important; }
          .desktop-wrapper { display: block !important; }
        }
        @media (max-width: 360px) {
          .mobile-list article { padding: 10px !important; font-size: 13px; }
        }
      `}</style>
    </div>
  );
};

export default TableAmPm;

// // TableAmPm.jsx
// import React from 'react';
// import { format, eachDayOfInterval, parseISO, isSunday } from 'date-fns';

// /**
//  * TableAmPm — responsive DTR display
//  * Desktop:  Date | AM (In/Out) | PM (In/Out) | Credit
//  * Mobile :  stacked, readable blocks
//  *
//  * Props:
//  *  - dtrData: [{ date, am_in, am_out, pm_in, pm_out, total_credit }]
//  *  - dateFrom: 'YYYY-MM-DD'
//  *  - dateUntil: 'YYYY-MM-DD'
//  */
// const TableAmPm = ({ dtrData = [], dateFrom, dateUntil }) => {
//   if (!dateFrom || !dateUntil) {
//     return (
//       <div style={{ width: '100%', padding: 12, textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>
//         Missing date range — cannot render DTR.
//       </div>
//     );
//   }

//   let allDates = [];
//   try {
//     allDates = eachDayOfInterval({ start: parseISO(dateFrom), end: parseISO(dateUntil) });
//   } catch (error) {
//     console.error('Invalid date range:', error);
//     return (
//       <div style={{ width: '100%', padding: 12, textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>
//         Invalid date range
//       </div>
//     );
//   }

//   const dtrMap = (dtrData || []).reduce((acc, record) => {
//     const raw = record?.date || record?.attendance_date || record?.attendanceDate;
//     if (!raw) return acc;
//     try {
//       const normalized = format(parseISO(String(raw)), 'yyyy-MM-dd');
//       acc[normalized] = record;
//     } catch (e) {}
//     return acc;
//   }, {});

//   const formatTime = (timeStr) => {
//     if (!timeStr || timeStr === '00:00:00' || String(timeStr).trim() === '-') return '-';
//     const parts = String(timeStr).split(':').map((p) => p.trim());
//     if (parts.length < 2) return timeStr;
//     const hh = parseInt(parts[0], 10);
//     const mm = parseInt(parts[1], 10);
//     if (Number.isNaN(hh) || Number.isNaN(mm)) return timeStr;
//     const d = new Date();
//     d.setHours(hh, mm, 0, 0);
//     try {
//       return format(d, 'h:mm a');
//     } catch {
//       return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
//     }
//   };

//   const fmtDateShort = (d) => {
//     try { return format(d, 'MMM dd'); } catch { return ''; }
//   };
//   const fmtDayName = (d) => {
//     try { return format(d, 'EEE'); } catch { return ''; }
//   };

//   // container
//   const containerStyle = {
//     width: '100%',
//     maxWidth: '100%',
//     boxSizing: 'border-box',
//     background: '#fff',
//     borderRadius: 10,
//     border: '1px solid #e6e6e6',
//     overflow: 'hidden',
//   };

//   // desktop row style — compact small/medium typography for readability
//   const desktopRowStyle = {
//     display: 'grid',
//     gridTemplateColumns: '160px 1fr 1fr 96px', // date | AM | PM | credit
//     gap: 12,
//     alignItems: 'center',
//     padding: '8px 12px',
//     borderBottom: '1px solid #f1f1f1',
//     boxSizing: 'border-box',
//     fontSize: 13,
//   };

//   const headerStyle = {
//     display: 'grid',
//     gridTemplateColumns: '160px 1fr 1fr 96px',
//     gap: 12,
//     padding: '8px 12px',
//     fontWeight: 700,
//     color: '#374151',
//     fontSize: 13,
//     borderBottom: '1px solid #f1f1f1',
//   };

//   return (
//     <div style={containerStyle} aria-live="polite">
//       {/* Desktop header + rows (hidden on small screens via CSS below) */}
//       <div className="desktop-wrapper" style={{ display: 'none' }}>
//         <div style={headerStyle}>
//           <div>Date</div>
//           <div style={{ textAlign: 'center' }}>AM</div>
//           <div style={{ textAlign: 'center' }}>PM</div>
//           <div style={{ textAlign: 'right' }}>Credit</div>
//         </div>

//         {allDates.map((currentDate, i) => {
//           const dateKey = format(currentDate, 'yyyy-MM-dd');
//           const rec = dtrMap[dateKey];
//           const sunday = isSunday(currentDate);
//           const rowBg = sunday ? { background: '#FFF1F2' } : i % 2 === 0 ? { background: '#fff' } : { background: '#fbfcfd' };

//           return (
//             <div key={dateKey} style={{ ...desktopRowStyle, ...rowBg }}>
//               <div>
//                 <div style={{ fontWeight: 700 }}>{fmtDateShort(currentDate)}</div>
//                 <div style={{ color: '#6b7280', marginTop: 4, fontSize: 12 }}>{fmtDayName(currentDate)}</div>
//               </div>

//               {sunday ? (
//                 <div style={{ gridColumn: '2 / span 2', textAlign: 'center', fontWeight: 700, color: '#b91c1c' }}>
//                   Sunday
//                 </div>
//               ) : rec ? (
//                 <>
//                   <div style={{ textAlign: 'center' }}>
//                     <div style={{ fontSize: 12, color: '#6b7280' }}>In</div>
//                     <div style={{ fontWeight: 600, marginTop: 6 }}>{formatTime(rec.am_in)}</div>
//                     <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Out</div>
//                     <div style={{ fontWeight: 600, marginTop: 6 }}>{formatTime(rec.am_out)}</div>
//                   </div>

//                   <div style={{ textAlign: 'center' }}>
//                     <div style={{ fontSize: 12, color: '#6b7280' }}>In</div>
//                     <div style={{ fontWeight: 600, marginTop: 6 }}>{formatTime(rec.pm_in)}</div>
//                     <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Out</div>
//                     <div style={{ fontWeight: 600, marginTop: 6 }}>{formatTime(rec.pm_out)}</div>
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <div style={{ textAlign: 'center', color: '#6b7280' }}>-</div>
//                   <div style={{ textAlign: 'center', color: '#6b7280' }}>-</div>
//                 </>
//               )}

//               <div style={{ textAlign: 'right', fontWeight: 800, color: rec ? '#4f46e5' : '#6b7280' }}>
//                 {rec ? (rec.total_credit ?? '0.00') : '0.00'}
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {/* Mobile stacked list (default visible) */}
//       <div className="mobile-list" style={{ padding: 10 }}>
//         {allDates.map((currentDate) => {
//           const dateKey = format(currentDate, 'yyyy-MM-dd');
//           const rec = dtrMap[dateKey];
//           const sunday = isSunday(currentDate);

//           return (
//             <article
//               key={dateKey}
//               style={{
//                 display: 'flex',
//                 flexDirection: 'column',
//                 gap: 8,
//                 padding: 12,
//                 borderRadius: 8,
//                 background: sunday ? '#FFF1F2' : '#fff',
//                 border: sunday ? '1px solid rgba(239,68,68,0.06)' : '1px solid rgba(0,0,0,0.03)',
//                 marginBottom: 10,
//                 boxSizing: 'border-box',
//                 fontSize: 13,
//               }}
//               aria-labelledby={`dtr-${dateKey}-label`}
//             >
//               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//                 <div>
//                   <div id={`dtr-${dateKey}-label`} style={{ fontWeight: 700 }}>{fmtDateShort(currentDate)}</div>
//                   <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{fmtDayName(currentDate)}</div>
//                 </div>

//                 <div style={{ textAlign: 'right' }}>
//                   <div style={{ fontSize: 12, color: '#6b7280' }}>Credit</div>
//                   <div style={{ fontWeight: 800, color: rec ? '#4f46e5' : '#6b7280', marginTop: 4 }}>
//                     {rec ? (rec.total_credit ?? '0.00') : '0.00'}
//                   </div>
//                 </div>
//               </div>

//               {sunday ? (
//                 <div style={{ marginTop: 4, fontWeight: 700, color: '#b91c1c' }}>Sunday — 0.00</div>
//               ) : rec ? (
//                 <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//                   <div>
//                     <div style={{ fontSize: 12, color: '#6b7280' }}>AM</div>
//                     <div style={{ marginTop: 6 }}>
//                       <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
//                         <div style={{ fontSize: 12, color: '#6b7280' }}>In</div>
//                         <div style={{ fontWeight: 600 }}>{formatTime(rec.am_in)}</div>
//                       </div>
//                       <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
//                         <div style={{ fontSize: 12, color: '#6b7280' }}>Out</div>
//                         <div style={{ fontWeight: 600 }}>{formatTime(rec.am_out)}</div>
//                       </div>
//                     </div>
//                   </div>

//                   <div>
//                     <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>PM</div>
//                     <div style={{ marginTop: 6 }}>
//                       <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
//                         <div style={{ fontSize: 12, color: '#6b7280' }}>In</div>
//                         <div style={{ fontWeight: 600 }}>{formatTime(rec.pm_in)}</div>
//                       </div>
//                       <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 6 }}>
//                         <div style={{ fontSize: 12, color: '#6b7280' }}>Out</div>
//                         <div style={{ fontWeight: 600 }}>{formatTime(rec.pm_out)}</div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div style={{ marginTop: 4, color: '#6b7280' }}>
//                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
//                     <div>AM</div>
//                     <div>-</div>
//                   </div>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
//                     <div>PM</div>
//                     <div>-</div>
//                   </div>
//                 </div>
//               )}
//             </article>
//           );
//         })}
//       </div>

//       {/* responsive CSS switch */}
//       <style>{`
//         /* show desktop layout at 768px and up */
//         @media (min-width: 768px) {
//           .mobile-list { display: none !important; }
//           .desktop-wrapper { display: block !important; }
//         }

//         /* slightly smaller padding on very small screens */
//         @media (max-width: 360px) {
//           .mobile-list article { padding: 10px !important; font-size: 13px; }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default TableAmPm;
