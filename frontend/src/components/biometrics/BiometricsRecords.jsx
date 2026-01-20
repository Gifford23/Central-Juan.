// BiometricsRecords.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import BASE_URL from "../../../backend/server/config";

/**
 * BiometricsRecords (Swal animated import progress)
 * - Fetches biometrics logs, groups them per person/day with dedupe-by-minute logic
 * - Search, date range filter, sort, pagination
 * - Export grouped rows to CSV
 * - SweetAlert2 confirmation + animated progress bar while importing (chunked)
 *
 * Tailwind CSS is used for styling (assumes Tailwind is in your project).
 */

export default function BiometricsRecords({ onBack }) {
  const [records, setRecords] = useState([]);
  const [groupedRows, setGroupedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState("table"); // table | cards
  const [sortBy, setSortBy] = useState("date"); // date | name | person_id
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${BASE_URL}/attendance_biometrics/fetch_records.php`);
      const data = res.data && (res.data.records || res.data.data) ? (res.data.records || res.data.data) : [];
      if (!Array.isArray(data)) {
        setError("Unexpected response shape from server");
        setRecords([]);
        setGroupedRows([]);
        setLoading(false);
        return;
      }
      setRecords(data);
      const grouped = groupByPersonDate(data);
      setGroupedRows(grouped);
      setPage(1);
    } catch (err) {
      console.error("Error fetching records:", err);
      setError("Failed to fetch records");
      setRecords([]);
      setGroupedRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Parsing & grouping helpers ------------------

  // Robust parser for many formats (returns Date or null)
  const parseDate = (ts) => {
    if (ts === null || ts === undefined) return null;
    let s = String(ts).trim();
    if (!s) return null;

    // ISO-ish -> make T
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?/.test(s)) {
      s = s.replace(" ", "T");
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }

    // dd/mm/yyyy or dd-mm-yyyy optionally with time and am/pm
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i);
    if (m) {
      const dd = m[1].padStart(2, "0"),
            mm = m[2].padStart(2, "0"),
            yyyy = m[3];
      let hh = m[4] !== undefined ? Number(m[4]) : 0;
      const mins = m[5] !== undefined ? Number(m[5]) : 0;
      const secs = m[6] !== undefined ? Number(m[6]) : 0;
      const ampm = m[7];
      if (ampm) {
        const a = ampm.toLowerCase();
        if (a === "pm" && hh < 12) hh += 12;
        if (a === "am" && hh === 12) hh = 0;
      }
      const iso = `${yyyy}-${mm}-${dd}T${String(hh).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }

    // fallback to Date parsing
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

  const formatTime = (ts) => {
    const d = parseDate(ts);
    if (!d) return "";
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const dateKey = (ts) => {
    const d = parseDate(ts);
    if (!d) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // dedupe within same minute keeping earliest second
  const groupByPersonDate = (rows) => {
    const map = new Map();
    for (const r of rows) {
      const timeRaw = r.time_log ?? r.Time ?? r["Time"] ?? r.time ?? r.timestamp ?? "";
      const parsed = parseDate(timeRaw);
      if (!parsed) continue;

      const dk = dateKey(timeRaw);
      if (!dk) continue;

      const personId = r.person_id ?? r["Person ID"] ?? r.personid ?? r.ID ?? r.user_id ?? "";
      const name = r.name ?? r.Name ?? r.username ?? r.employee_name ?? "";
      const dept = r.department ?? r.Department ?? r.dept ?? "";

      const key = `${personId}||${dk}`;
      if (!map.has(key)) {
        map.set(key, {
          person_id: personId,
          name,
          department: dept,
          date: dk,
          minuteMap: new Map()
        });
      }

      const obj = map.get(key);
      const hh = String(parsed.getHours()).padStart(2, "0");
      const mm = String(parsed.getMinutes()).padStart(2, "0");
      const minuteKey = `${dk} ${hh}:${mm}`;
      const ts = parsed.getTime();

      const existing = obj.minuteMap.get(minuteKey);
      if (!existing || ts < existing.ts) {
        obj.minuteMap.set(minuteKey, { raw: timeRaw, ts });
      }
    }

    const result = [];
    for (const [, obj] of map) {
      const timesArray = Array.from(obj.minuteMap.values()).sort((a, b) => a.ts - b.ts);
      const tVals = timesArray.map(t => t.raw);

      result.push({
        person_id: obj.person_id,
        name: obj.name,
        department: obj.department,
        date: obj.date,
        morning_in: tVals[0] ?? "",
        morning_out: tVals[1] ?? "",
        afternoon_in: tVals[2] ?? "",
        afternoon_out: tVals[3] ?? ""
      });
    }

    result.sort((a, b) => {
      if (a.date === b.date) return String(a.name).localeCompare(String(b.name));
      return a.date.localeCompare(b.date);
    });

    return result;
  };

  const formatTimeForSQL = (rawTs) => {
    if (!rawTs) return null;
    const d = parseDate(rawTs);
    if (!d) return null;
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const ss = String(d.getSeconds()).padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  };

  // ------------------ UI helpers: filtering, sorting, pagination ------------------

  const filteredAndSorted = useMemo(() => {
    let data = groupedRows.slice();

    // search query (match name, person_id, department, date)
    if (query && query.trim() !== "") {
      const q = query.trim().toLowerCase();
      data = data.filter(r =>
        String(r.name ?? "").toLowerCase().includes(q) ||
        String(r.person_id ?? "").toLowerCase().includes(q) ||
        String(r.department ?? "").toLowerCase().includes(q) ||
        String(r.date ?? "").toLowerCase().includes(q)
      );
    }

    // date range filter (YYYY-MM-DD)
    if (dateFrom) {
      data = data.filter(r => r.date >= dateFrom);
    }
    if (dateTo) {
      data = data.filter(r => r.date <= dateTo);
    }

    // sort
    const dir = sortDir === "asc" ? 1 : -1;
    data.sort((a, b) => {
      if (sortBy === "name") {
        return dir * String(a.name ?? "").localeCompare(String(b.name ?? ""));
      } else if (sortBy === "person_id") {
        return dir * String(a.person_id ?? "").localeCompare(String(b.person_id ?? ""));
      } else {
        // date
        return dir * String(a.date ?? "").localeCompare(String(b.date ?? ""));
      }
    });

    return data;
  }, [groupedRows, query, dateFrom, dateTo, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  // ------------------ Actions ------------------

  const handleExportCSV = () => {
    const rowsToExport = filteredAndSorted;
    if (!rowsToExport.length) {
      Swal.fire({ icon: "info", title: "No rows", text: "No rows to export." });
      return;
    }
    const headers = ["date","person_id","name","department","morning_in","morning_out","afternoon_in","afternoon_out"];
    const csv = [
      headers.join(","),
      ...rowsToExport.map(r =>
        headers.map(h => {
          const v = r[h] ?? "";
          // escape quotes
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grouped-biometrics-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ------------------ SweetAlert2 animated import ------------------

  const updateProgress = (percent, text) => {
    const bar = document.getElementById("swal-import-progress-bar");
    const label = document.getElementById("swal-import-progress-text");
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    if (label) label.innerText = text ?? "";
  };

  const startImportLoading = () => {
    // reset any previous interval
    if (window.__swalImportInterval) {
      clearInterval(window.__swalImportInterval);
      window.__swalImportInterval = null;
    }

    updateProgress(0, "Preparing...");
    Swal.fire({
      title: "Importing...",
      html: `
        <div style="width:100%; background:#f3f4f6; border-radius:8px; height:12px; margin-top:12px; overflow:hidden;">
          <div id="swal-import-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg,#10b981,#059669); transition: width 300ms ease;"></div>
        </div>
        <div id="swal-import-progress-text" style="margin-top:10px; font-size:13px; color:#374151;">Starting...</div>
      `,
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Soft animation until server updates; fill to 85-90% maximum
    let pseudo = 0;
    window.__swalImportInterval = setInterval(() => {
      if (pseudo >= 88) return;
      pseudo += Math.floor(Math.random() * 6) + 3; // 3-8%
      if (pseudo > 88) pseudo = 88;
      updateProgress(pseudo, "Processing...");
    }, 450);
  };

  const confirmImport = () => {
    Swal.fire({
      title: "Apply attendance records?",
      text: "This will match grouped rows by person ID and update the attendance table. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, apply",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        handleImportConfirmed();
      }
    });
  };

  const handleImportConfirmed = async () => {
    if (!groupedRows || groupedRows.length === 0) {
      Swal.fire({ icon: "info", title: "Nothing to import", text: "No grouped rows available." });
      return;
    }

    setImporting(true);
    startImportLoading();

    // Prepare payload rows (map to API expected shape)
    const payloadRows = groupedRows.map(r => ({
      person_id: r.person_id,
      date: r.date,
      morning_in: formatTimeForSQL(r.morning_in),
      morning_out: formatTimeForSQL(r.morning_out),
      afternoon_in: formatTimeForSQL(r.afternoon_in),
      afternoon_out: formatTimeForSQL(r.afternoon_out),
      name: r.name
    }));

    const total = payloadRows.length;
    const chunkSize = 500; // you can expose this as UI if you like

    let processed = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let errors = [];

    try {
      for (let i = 0; i < payloadRows.length; i += chunkSize) {
        const chunk = payloadRows.slice(i, i + chunkSize);
        // send chunk to server
        const res = await axios.post(
          `${BASE_URL}/attendance_biometrics/import_attendance_by_personid.php`,
          { records: chunk },
          { headers: { "Content-Type": "application/json" } }
        );

        // If API returns structured counts, accumulate them
        if (res?.data) {
          const d = res.data;
          if (typeof d.inserted === "number") totalInserted += d.inserted;
          if (typeof d.updated === "number") totalUpdated += d.updated;
          if (typeof d.skipped === "number") totalSkipped += d.skipped;
          if (Array.isArray(d.errors_sample) && d.errors_sample.length) {
            errors.push(...d.errors_sample);
          }
        }

        processed += chunk.length;
        // reserve final 10% for finalizing
        const percent = Math.min(90, Math.round((processed / total) * 90));
        updateProgress(percent, `Processed ${processed}/${total}`);
        // small delay so user sees progress smoothly
        await new Promise((resDelay) => setTimeout(resDelay, 200));
      }

      // done sending chunks: finalize
      if (window.__swalImportInterval) {
        clearInterval(window.__swalImportInterval);
        window.__swalImportInterval = null;
      }

      updateProgress(100, "Finalizing...");
      // small pause so animation completes
      await new Promise((r) => setTimeout(r, 500));

      Swal.close(); // close the progress Swal

      // show final summary
      Swal.fire({
        icon: "success",
        title: "Import Complete",
        html: `
          <div style="text-align:left">
            <p><strong>Total rows sent:</strong> ${total}</p>
            <p><strong>Inserted:</strong> ${totalInserted}</p>
            <p><strong>Updated:</strong> ${totalUpdated}</p>
            <p><strong>Skipped:</strong> ${totalSkipped}</p>
            ${errors.length ? `<p style="margin-top:8px;"><strong>Sample error:</strong> ${JSON.stringify(errors[0])}</p>` : ""}
          </div>
        `,
        confirmButtonColor: "#16a34a",
      });

      // refresh data
      await fetchRecords();
    } catch (err) {
      console.error("Import error:", err);
      if (window.__swalImportInterval) {
        clearInterval(window.__swalImportInterval);
        window.__swalImportInterval = null;
      }
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Import Failed",
        text: "An error occurred during import. Check console for details.",
      });
    } finally {
      setImporting(false);
    }
  };

  // ------------------ Small UI subcomponents ------------------

  const SmallStat = ({ label, value }) => (
    <div className="bg-gray-50 px-3 py-2 rounded text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-gray-800">{value}</div>
    </div>
  );

  // ------------------ Render ------------------

  // departments list derived from groupedRows
  const departments = Array.from(new Set(groupedRows.map(r => r.department || "Unknown"))).slice(0, 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="w-full">
        <div className="bg-white shadow-lg rounded-2xl p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Biometrics Records (per day)</h1>
              <p className="text-sm text-gray-500 mt-1">Grouped by person and date — duplicates within the same minute are collapsed (earliest second kept).</p>
            </div>

            <div className="flex items-center gap-3">
              <SmallStat label="Raw logs" value={records.length} />
              <SmallStat label="Grouped rows" value={groupedRows.length} />
              <button onClick={onBack} className="px-3 py-2 bg-white border rounded-md text-gray-700 hover:bg-gray-50">← Back</button>
              <button onClick={fetchRecords} className="px-3 py-2 bg-white border rounded-md text-blue-600 hover:bg-blue-50">🔄 Refresh</button>
              <button onClick={confirmImport} disabled={importing || groupedRows.length===0} className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                {importing ? "Importing..." : "Apply Attendance"}
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-center">
            <div className="flex items-center gap-2">
              <input value={query} onChange={(e)=>{ setQuery(e.target.value); setPage(1); }} placeholder="Search name / ID / dept / date..." className="w-full px-3 py-2 border rounded-md" />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">From</label>
              <input type="date" value={dateFrom} onChange={(e)=>{ setDateFrom(e.target.value); setPage(1); }} className="px-2 py-1 border rounded-md" />
              <label className="text-xs text-gray-500">To</label>
              <input type="date" value={dateTo} onChange={(e)=>{ setDateTo(e.target.value); setPage(1); }} className="px-2 py-1 border rounded-md" />
            </div>

            <div className="flex items-center justify-end gap-2">
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="px-2 py-1 border rounded-md">
                <option value="date">Sort: Date</option>
                <option value="name">Sort: Name</option>
                <option value="person_id">Sort: Person ID</option>
              </select>
              <button onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")} className="px-3 py-1 border rounded-md">
                {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>

              <div className="flex items-center gap-2 border rounded-md px-2 py-1">
                <label className="text-xs text-gray-500 mr-2">View</label>
                <button onClick={()=>setView("table")} className={`px-2 py-1 rounded ${view==="table" ? "bg-gray-200" : ""}`}>Table</button>
                <button onClick={()=>setView("cards")} className={`px-2 py-1 rounded ${view==="cards" ? "bg-gray-200" : ""}`}>Cards</button>
              </div>

              <button onClick={handleExportCSV} className="px-3 py-1 bg-indigo-600 text-white rounded-md">Export CSV</button>
            </div>
          </div>

          {/* Main content */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading records...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">{error}</div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No records found.</div>
          ) : (
            <>
              {view === "table" ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full text-sm text-gray-700 table-auto">
                    <thead className="bg-gray-50 text-gray-800 uppercase text-xs sticky top-0">
                      <tr>
                        <th className="px-4 py-3 border-b min-w-[130px]">Date</th>
                        <th className="px-4 py-3 border-b min-w-[110px]">Person ID</th>
                        <th className="px-4 py-3 border-b min-w-[220px]">Name</th>
                        <th className="px-4 py-3 border-b min-w-[160px]">Department</th>
                        <th className="px-4 py-3 border-b min-w-[120px]">Morning In</th>
                        <th className="px-4 py-3 border-b min-w-[120px]">Morning Out</th>
                        <th className="px-4 py-3 border-b min-w-[120px]">Afternoon In</th>
                        <th className="px-4 py-3 border-b min-w-[120px]">Afternoon Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((r, idx) => (
                        <tr key={`${r.person_id}-${r.date}-${idx}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 border-b">{formatDisplayDate(r.date)}</td>
                          <td className="px-4 py-3 border-b">{r.person_id}</td>
                          <td className="px-4 py-3 border-b break-words">{r.name}</td>
                          <td className="px-4 py-3 border-b break-words">{r.department}</td>
                          <td className="px-4 py-3 border-b">{formatTime(r.morning_in)}</td>
                          <td className="px-4 py-3 border-b">{formatTime(r.morning_out)}</td>
                          <td className="px-4 py-3 border-b">{formatTime(r.afternoon_in)}</td>
                          <td className="px-4 py-3 border-b">{formatTime(r.afternoon_out)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pageItems.map((r, idx) => (
                    <div key={`${r.person_id}-${r.date}-${idx}`} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-gray-500">{formatDisplayDate(r.date)}</div>
                          <div className="text-lg font-semibold text-gray-800 mt-1">{r.name || "—"}</div>
                          <div className="text-xs text-gray-500 mt-1">ID: {r.person_id || "—"} • {r.department || "—"}</div>
                        </div>
                        <div className="text-sm text-right">
                          <div className="text-xs text-gray-400">Morning</div>
                          <div className="font-medium">{formatTime(r.morning_in)} / {formatTime(r.morning_out)}</div>
                          <div className="text-xs text-gray-400 mt-2">Afternoon</div>
                          <div className="font-medium">{formatTime(r.afternoon_in)} / {formatTime(r.afternoon_out)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={()=>{ setPage(1); }} disabled={page===1} className="px-3 py-1 border rounded disabled:opacity-50">First</button>
                  <button onClick={()=>{ setPage(p => Math.max(1, p-1)); }} disabled={page===1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                  <div className="px-3 py-1">Page <strong>{page}</strong> of {totalPages}</div>
                  <button onClick={()=>{ setPage(p => Math.min(totalPages, p+1)); }} disabled={page===totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                  <button onClick={()=>{ setPage(totalPages); }} disabled={page===totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Last</button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-500">Rows per page</label>
                  <select value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-1 border rounded">
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
