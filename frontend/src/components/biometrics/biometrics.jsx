// Biometrics.jsx
import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import axios from "axios";
import Swal from "sweetalert2";
import BiometricsRecords from "./BiometricsRecords";
import BASE_URL from "../../../backend/server/config";

/**
 * Full Biometrics.jsx (list scrolls, not entire screen)
 * - Clean horizontal list preview
 * - Word-format dates (e.g., "October 24, 2025 6:00 PM")
 * - Upload, parse, preview, process (batch POST), and export CSV
 * - Tailwind CSS assumed
 */

export default function Biometrics() {
  const [rows, setRows] = useState([]); // parsed rows
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showRecords, setShowRecords] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [chunkSize, setChunkSize] = useState(500);
  const [progressPercent, setProgressPercent] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);

  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  // ---------- Date parsing utilities ----------
  const parseFlexibleDate = (raw) => {
    if (raw === null || raw === undefined) return null;
    let s = String(raw).trim();
    if (!s) return null;

    // ISO-ish "YYYY-MM-DD HH:MM(:SS)?" -> Date
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?/.test(s)) {
      const d = new Date(s.replace(" ", "T"));
      if (!isNaN(d.getTime())) return d;
    }

    // dd/mm/yyyy or dd-mm-yyyy optionally with time and am/pm
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i);
    if (m) {
      const dd = m[1].padStart(2,'0'), mm = m[2].padStart(2,'0'), yyyy = m[3];
      let hh = m[4] !== undefined ? Number(m[4]) : 0;
      const mins = m[5] !== undefined ? Number(m[5]) : 0;
      const secs = m[6] !== undefined ? Number(m[6]) : 0;
      const ampm = m[7];
      if (ampm) {
        const a = ampm.toLowerCase();
        if (a === 'pm' && hh < 12) hh += 12;
        if (a === 'am' && hh === 12) hh = 0;
      }
      const iso = `${yyyy}-${mm}-${dd}T${String(hh).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }

    // Common written formats like "Oct 24, 2025 6:00 PM"
    const d2 = new Date(s);
    if (!isNaN(d2.getTime())) return d2;

    // Try replace slashes with dashes
    const d3 = new Date(s.replace(/\//g, "-"));
    if (!isNaN(d3.getTime())) return d3;

    return null;
  };

  const formatToSQLDatetime = (d) => {
    if (!d) return null;
    const dt = d instanceof Date ? d : parseFlexibleDate(d);
    if (!dt) return null;
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2,'0');
    const dd = String(dt.getDate()).padStart(2,'0');
    const hh = String(dt.getHours()).padStart(2,'0');
    const mi = String(dt.getMinutes()).padStart(2,'0');
    const ss = String(dt.getSeconds()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  // Format visible time into words: "October 24, 2025 6:00 PM"
  const formatReadableTime = (sqlOrRaw) => {
    if (!sqlOrRaw) return "Invalid";
    const d = parseFlexibleDate(sqlOrRaw) || new Date(sqlOrRaw);
    if (!d || isNaN(d.getTime())) return "Invalid";
    return d.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  // ---------- File parsing ----------
  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setStatusMessage("");
    setProgressPercent(0);
    setProcessedCount(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        const parsed = results.data.map((row, idx) => {
          // auto-detect first column that contains "time"
          const timeKey = Object.keys(row).find(k => k && k.toLowerCase().includes("time"));
          const rawTime = timeKey ? row[timeKey] : (row["Time"] ?? row["time"] ?? row["timestamp"] ?? "");
          const parsedDate = parseFlexibleDate(rawTime);
          const time_sql = parsedDate ? formatToSQLDatetime(parsedDate) : null;

          // detect person id, name, department
          const personKey = Object.keys(row).find(k => k && /(^person\b|\bperson\b|\bperson id\b|\bpersonid\b|\bemployee_id\b|\buser_id\b|\bid\b)/i.test(k) && !/time/i.test(k));
          const person_id = personKey ? row[personKey] : (row["Person ID"] ?? row["person_id"] ?? row["ID"] ?? "");

          const nameKey = Object.keys(row).find(k => k && /\bname\b/i.test(k));
          const name = nameKey ? row[nameKey] : (row["Name"] ?? row["name"] ?? "");

          const deptKey = Object.keys(row).find(k => k && /\b(department|dept)\b/i.test(k));
          const department = deptKey ? row[deptKey] : (row["Department"] ?? row["department"] ?? "");

          return {
            __idx: idx,
            original: row,            // keep original for extracting raw "Attendance Status" if present
            person_id,
            name,
            department,
            rawTime,
            time_sql,
            parsedDate
          };
        });

        // sort: parsed dates first in chronological order, then by rawTime fallback
        parsed.sort((a,b) => {
          const ta = a.parsedDate ? a.parsedDate.getTime() : Number.POSITIVE_INFINITY;
          const tb = b.parsedDate ? b.parsedDate.getTime() : Number.POSITIVE_INFINITY;
          if (ta === tb) return (a.rawTime || "").localeCompare(b.rawTime || "");
          return ta - tb;
        });

        setRows(parsed);
        setStatusMessage(`Loaded ${parsed.length} rows`);
      },
      error: (err) => {
        console.error("CSV parse error", err);
        setStatusMessage("Error parsing CSV. Check file format.");
      }
    });
  };

  const onFileInputChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFile(f);
  };

  // drag & drop wiring
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e) => { e.preventDefault(); el.classList.add("ring-2","ring-offset-2","ring-indigo-300"); };
    const onDragLeave = (e) => { e.preventDefault(); el.classList.remove("ring-2","ring-offset-2","ring-indigo-300"); };
    const onDrop = (e) => {
      e.preventDefault(); el.classList.remove("ring-2","ring-offset-2","ring-indigo-300");
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  const clearAll = () => {
    setRows([]);
    setFileName("");
    setStatusMessage("");
    setSearch("");
    setFilterDept("all");
    setProgressPercent(0);
    setProcessedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // departments for filter
  const departments = Array.from(new Set(rows.map(r => (r.department || "Unknown")))).slice(0, 100);

  // filtered rows for display
  const filtered = rows.filter(r => {
    if (search) {
      const s = search.toLowerCase();
      if (!(
        String(r.person_id || "").toLowerCase().includes(s) ||
        String(r.name || "").toLowerCase().includes(s) ||
        String(r.department || "").toLowerCase().includes(s) ||
        String(r.rawTime || "").toLowerCase().includes(s)
      )) return false;
    }
    if (filterDept !== "all" && (r.department || "Unknown") !== filterDept) return false;
    return true;
  });

  // ---------- Row component ----------
  const avatarText = (id) => {
    const s = String(id ?? "");
    if (!s) return "?";
    return s.slice(-3);
  };

  const RowItem = ({ r }) => {
    const timeDisplay = formatReadableTime(r.time_sql ?? r.rawTime);
    const idDisplay = r.person_id ?? "—";
    const nameDisplay = r.name ?? "—";
    const deptDisplay = r.department ?? "—";
    const timeValid = !!r.parsedDate;

    return (
      <div className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 shadow-sm hover:shadow transition">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
            {avatarText(idDisplay)}
          </div>

          <div>
            <div className="font-medium text-gray-800">{nameDisplay}</div>
            <div className="text-xs text-gray-500">ID: {idDisplay} • {deptDisplay}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`text-xs px-2 py-1 rounded ${timeValid ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
            {timeValid ? "Valid" : "Invalid"}
          </div>

          <div className="font-medium text-gray-700 whitespace-nowrap">{timeDisplay}</div>
        </div>
      </div>
    );
  };

  // ---------- Processing (batch POST) ----------
  const handleProcess = async () => {
    if (!rows || rows.length === 0) {
      setStatusMessage("No data to process.");
      return;
    }
    setLoading(true);
    setStatusMessage("Processing records...");
    setProgressPercent(0);
    setProcessedCount(0);

    const effectiveChunk = Number.isInteger(+chunkSize) && chunkSize > 0 ? +chunkSize : 500;
    let processed = 0;

    // Build payload rows and include Attendance Status if present in original CSV row
    const payloadRows = rows.map(r => {
      const orig = r.original || {};
      // detect a status-like column name (case-insensitive)
      const statusKey = Object.keys(orig).find(k => k && /status|attendance|type/i.test(k));
      const statusVal = statusKey ? orig[statusKey] : (orig["Attendance Status"] ?? orig["Status"] ?? orig["attendance_status"] ?? null);

      return {
        "Person ID": r.person_id,
        "Name": r.name,
        "Department": r.department,
        "Time": r.time_sql ?? r.rawTime,
        // send the status exactly as present in CSV (or null if not present)
        "Attendance Status": statusVal
      };
    });

    // accumulators
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let debugRows = [];

    try {
      for (let i = 0; i < payloadRows.length; i += effectiveChunk) {
        const chunk = payloadRows.slice(i, i + effectiveChunk);
        const res = await axios.post(
          `${BASE_URL}/attendance_biometrics/import.php`,
          { records: chunk },
          { headers: { "Content-Type": "application/json" } }
        );

        // handle response debug (backend should provide inserted/updated/skipped/debug_rows)
        if (res && res.data) {
          const d = res.data;
          if (typeof d.inserted === "number") totalInserted += d.inserted;
          if (typeof d.updated === "number") totalUpdated += d.updated;
          if (typeof d.skipped === "number") totalSkipped += d.skipped;
          if (Array.isArray(d.debug_rows)) debugRows.push(...d.debug_rows);
          if (Array.isArray(d.errors_sample)) debugRows.push(...d.errors_sample.map(e => ({ error_sample: e })));
        }

        processed += chunk.length;
        const percent = Math.round((processed / payloadRows.length) * 100);
        setProcessedCount(processed);
        setProgressPercent(percent);
        setStatusMessage(`Processed ${processed}/${payloadRows.length} (${percent}%)`);

        // small delay so UI shows progress smoothly
        await new Promise((resDelay) => setTimeout(resDelay, 120));
      }

      // Finalize
      setStatusMessage(`✅ Done: ${payloadRows.length} rows processed.`);

      // Show a concise Swal summary and provide quick access to console debug
      const sampleDebug = debugRows.length ? JSON.stringify(debugRows.slice(0,3), null, 2) : "No server debug returned.";
      Swal.fire({
        icon: "success",
        title: "Import finished",
        html: `
          <div style="text-align:left">
            <p><strong>Rows sent:</strong> ${payloadRows.length}</p>
            <p><strong>Inserted:</strong> ${totalInserted}</p>
            <p><strong>Updated:</strong> ${totalUpdated}</p>
            <p><strong>Skipped:</strong> ${totalSkipped}</p>
            <p style="margin-top:8px;"><strong>Server debug (sample):</strong></p>
            <pre style="text-align:left; background:#f8fafc; padding:8px; border-radius:6px; max-height:200px; overflow:auto;">${sampleDebug}</pre>
          </div>
        `,
        width: 720,
        confirmButtonText: "OK"
      });

      // Always log full debug to console for deep inspection
      console.info("Import result debug_rows:", debugRows);
      // refresh processed records list if you want
      // await fetchRecords(); // uncomment if you wish to reload the processed list
    } catch (err) {
      console.error("Processing error:", err);
      setStatusMessage("❌ Error during processing. See console for details.");
      Swal.fire({ icon: "error", title: "Import failed", text: "Check console/network for details." });
    } finally {
      setLoading(false);
    }
  };

  // ---------- Export CSV ----------
  const downloadProcessedCSV = () => {
    if (!rows || rows.length === 0) {
      setStatusMessage("No data to download.");
      return;
    }
    const exportRows = rows.map(r => ({"Person ID": r.person_id, "Name": r.name, "Department": r.department, "Time": r.time_sql ?? r.rawTime}));
    const csv = Papa.unparse(exportRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ? `processed-${fileName}` : `processed-export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------- File picker helper ----------
  const openFilePicker = () => fileInputRef.current && fileInputRef.current.click();

  // ---------- Show records view ----------
  if (showRecords) {
    return <BiometricsRecords onBack={() => setShowRecords(false)} />;
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        <div className="bg-white shadow rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Attendance Biometrics</h1>
              <p className="text-sm text-gray-500 mt-1">Upload a CSV file (header row required). Preview rows below and press <span className="font-medium">Process Records</span> when ready.</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowRecords(true)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"> View Processed Records</button>
              <button onClick={downloadProcessedCSV} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">Export CSV</button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left controls */}
            <div className="lg:col-span-1">
              <div ref={dropRef} onClick={openFilePicker} className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-300 transition">
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={onFileInputChange} />
                <div className="py-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V8a4 4 0 014-4h2a4 4 0 014 4v8m-6-4v4m0 0h.01" /></svg>
                  <div className="mt-2 text-sm text-gray-700 font-medium">Click or drop CSV here</div>
                  <div className="text-xs text-gray-400 mt-1">CSV with header row. Time column auto-detected.</div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button onClick={openFilePicker} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">Upload CSV</button>
                  <button onClick={clearAll} className="px-3 py-1.5 bg-white border rounded text-sm">Clear</button>
                </div>
              </div>

              <div className="mt-4 bg-gray-50 p-3 rounded text-sm text-gray-700">
                <div className="flex justify-between">
                  <div>
                    <div className="text-xs text-gray-500">File</div>
                    <div className="font-medium">{fileName || "None"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Rows</div>
                    <div className="font-medium">{rows.length}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs text-gray-500">Batch</label>
                  <input type="number" min={50} step={50} value={chunkSize} onChange={(e) => setChunkSize(Math.max(50, Number(e.target.value || 500)))} className="ml-2 w-24 px-2 py-1 border rounded text-sm" />
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={handleProcess} disabled={loading || rows.length === 0} className={`flex-1 px-4 py-2 rounded text-white ${loading || rows.length === 0 ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}>
                    {loading ? "Processing..." : "Process Records"}
                  </button>
                  <button onClick={downloadProcessedCSV} className="px-4 py-2 rounded bg-white border">Export</button>
                </div>

                {progressPercent > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500">Progress</div>
                    <div className="w-full bg-gray-200 h-2 rounded mt-2 overflow-hidden">
                      <div style={{ width: `${progressPercent}%` }} className="h-2 bg-indigo-500 transition-all" />
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{processedCount}/{rows.length} ({progressPercent}%)</div>
                  </div>
                )}

                {statusMessage && <div className="mt-3 text-sm text-gray-700">{statusMessage}</div>}
              </div>
            </div>

            {/* Right: List preview (scrollable panel only) */}
            <div className="lg:col-span-2 flex flex-col">
              <div className="flex items-center justify-between gap-4 mb-3">
                <input type="text" placeholder="Search ID / name / dept / time..." value={search} onChange={(e)=>setSearch(e.target.value)} className="flex-1 px-3 py-2 border rounded" />
                <select value={filterDept} onChange={(e)=>setFilterDept(e.target.value)} className="px-3 py-2 border rounded ml-3">
                  <option value="all">All departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* scrollable list container */}
              <div className="overflow-y-auto max-h-[56vh] pr-2">
                <div className="space-y-2">
                  {filtered.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">No preview available</div>
                  ) : (
                    filtered.map((r) => <RowItem key={r.__idx} r={r} />)
                  )}
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-500">
                Displaying <span className="font-medium text-gray-800">{filtered.length}</span> rows (total loaded: <span className="font-medium">{rows.length}</span>).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
