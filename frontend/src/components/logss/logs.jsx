import React, { useEffect, useState } from "react";
import BASE_URL from "../../../backend/server/config";
const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${BASE_URL}/logss/logs.php`);
        const data = await response.json();

        if (data.success) {
          const sorted = data.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setLogs(sorted);
          setFilteredLogs(sorted);
        } else {
          setError(data.message || "No records found.");
        }
      } catch (err) {
        console.error("Error fetching logs:", err);
        setError("Failed to load logs. Please check your connection or API path.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // 🔍 Filter logs by search query and date range
  useEffect(() => {
    let results = logs;

    if (search) {
      results = results.filter(
        (log) =>
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          (log.user_full_name && log.user_full_name.toLowerCase().includes(search.toLowerCase())) ||
          (log.user_role && log.user_role.toLowerCase().includes(search.toLowerCase()))
      );
    }

    if (dateFrom) {
      results = results.filter((log) => new Date(log.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      results = results.filter((log) => new Date(log.created_at) <= new Date(dateTo));
    }

    results = results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFilteredLogs(results);
  }, [search, dateFrom, dateTo, logs]);

  // 🕒 Format timestamp to: October 1, 2025 • 1:00 PM
  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) return <p className="text-center mt-10">Loading logs...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="p-6 relative">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">System Logs</h2>

      {/* 🔍 Search & Date Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          placeholder="Search logs by name, role, or action..."
          className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-400 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          type="date"
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="Filter from date"
        />

        <input
          type="date"
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="Filter to date"
        />
      </div>

      {/* 🧾 Logs Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              {/* <th className="py-3 px-4 border-b text-center w-16">#</th> */}
              <th className="py-3 px-4 border-b w-48 text-left">User Name</th>
              <th className="py-3 px-4 border-b w-32 text-left">Role</th>
              <th className="py-3 px-4 border-b w-2/4 text-right">Action</th>
              <th className="py-3 px-4 border-b w-48 text-right">Timestamp</th>
            </tr>
          </thead>

            <tbody>
            {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                <tr
                    key={log.log_id}
                    className="hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                >
                    {/* <td className="py-3 px-4 border-b text-center align-middle">{log.log_id}</td> */}
                    <td className="py-3 px-4 border-b align-middle">{log.user_full_name || "Unknown"}</td>
                    <td className="py-3 px-4 border-b align-middle">{log.user_role}</td>

                    {/* ✅ Clean, centered, clickable Action text */}
                    <td
                    className="py-3 px-4 border-b text-sm text-gray-800 align-middle text-right cursor-pointer hover:text-blue-600 transition-colors duration-100"
                    style={{
                        maxWidth: "450px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                    title="Click to view full log"
                    onClick={() => setSelectedLog(log)}
                    >
                    {log.action}
                    </td>

                    <td className="py-3 px-4 border-b text-gray-500 text-right align-middle whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                    </td>
                </tr>
                ))
            ) : (
                <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                    No matching logs found.
                </td>
                </tr>
            )}
            </tbody>

        </table>
      </div>

      {/* 🪟 Modal for full log view */}
      {selectedLog && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-3xl max-h-[80vh] overflow-y-auto p-6 relative">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">Log Details</h3>

            <div className="mb-4">
              <p><strong>User:</strong> {selectedLog.user_full_name || "Unknown"}</p>
              <p><strong>Role:</strong> {selectedLog.user_role}</p>
              <p><strong>Timestamp:</strong> {formatDateTime(selectedLog.created_at)}</p>
            </div>

            <div className="border-t pt-3">
              <p className="font-medium text-gray-700 mb-2">Full Action Log:</p>
              <div
                className="text-left whitespace-pre-wrap break-words text-gray-800 bg-gray-50 p-3 rounded-md border border-gray-200"
              >
                {selectedLog.action}
              </div>
            </div>

            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
              onClick={() => setSelectedLog(null)}
            >
              ×
            </button>

            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;
