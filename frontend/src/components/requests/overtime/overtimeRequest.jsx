import React, { useEffect, useState } from "react";
import BASE_URL from "../../../../backend/server/config";
import Swal from "sweetalert2";
import { Card, CardContent, Typography, Checkbox, Divider } from "@mui/material";
import { Trash2 } from "lucide-react";
import OvertimeSorting from "./overtimeFilterSorting";
import { useSession } from "../../../context/SessionContext";
import usePermissions from "../../../users/hooks/usePermissions";

const OvertimeFilter = ({ statusFilter, onStatusChange, requestCounts }) => {
  const statusOptions = ["All", "Pending", "Approved", "Rejected"];

  const safeCounts = {
    Pending: requestCounts.Pending || 0,
    Approved: requestCounts.Approved || 0,
    Rejected: requestCounts.Rejected || 0,
  };

  const totalRequests =
    safeCounts.Pending + safeCounts.Approved + safeCounts.Rejected;

  const getCount = (option) => {
    return option === "All" ? totalRequests : safeCounts[option];
  };

  return (
    <div className="w-full">
      {/* Filter Buttons */}
      <div
        className="grid gap-4 mb-4"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        {statusOptions.map((option) => {
          const isActive = statusFilter === option;

          const borderColor =
            option === "All"
              ? "border-blue-600"
              : option === "Pending"
              ? "border-yellow-600"
              : option === "Approved"
              ? "border-green-600"
              : "border-red-600";

          const bgColor = isActive
            ? option === "All"
              ? "bg-blue-200"
              : option === "Pending"
              ? "bg-yellow-200"
              : option === "Approved"
              ? "bg-green-200"
              : "bg-red-200"
            : option === "All"
            ? "bg-blue-100"
            : option === "Pending"
            ? "bg-yellow-100"
            : option === "Approved"
            ? "bg-green-100"
            : "bg-red-100";

          const badgeColor =
            option === "All"
              ? "bg-blue-500/50 border-blue-600"
              : option === "Pending"
              ? "bg-yellow-500/50 border-yellow-600"
              : option === "Approved"
              ? "bg-green-500/50 border-green-600"
              : "bg-red-500/50 border-red-600";

          const count = getCount(option);

          return (
            <button
              key={option}
              onClick={() => onStatusChange(option)}
              className={`flex items-center justify-between border rounded-xl px-4 py-3 shadow-md cursor-pointer transition-all duration-200 ease-in-out
                ${bgColor} ${borderColor}
                ${isActive ? "ring-2 ring-offset-2 ring-black/40" : ""}
              `}
            >
              <div
                className={`flex border px-3 py-1 rounded-md font-semibold text-sm ${badgeColor}`}
              >
                {option}
              </div>
              <div className="text-3xl italic font-normal">{count}</div>
            </button>
          );
        })}
      </div>

      {/* Empty Message */}
      {/* {statusFilter !== "All" && getCount(statusFilter) === 0 && (
        <div className="w-full text-center text-gray-500 italic mt-4">
          No overtime requests for{" "}
          <span className="font-semibold">{statusFilter}</span>.
        </div>
      )} */}
    </div>
  );
};

const OvertimeRequest = () => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [sortAscending, setSortAscending] = useState(true);
  const [selectedRequests, setSelectedRequests] = useState(new Set());

  const fetchOvertimeRequests = async () => {
    try {
      const response = await fetch(`${BASE_URL}/overtime/overtime_request.php`);
      const data = await response.json();
      if (data.success) {
        setOvertimeRequests(data.data);
      } else {
        console.error("Failed to fetch data");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOvertimeRequests();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`${BASE_URL}/overtime/edit_overtime_request.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          id,
          status: newStatus,
          approved_by: newStatus === "Approved" ? "Admin" : "Not approved yet",
        }),
      });
      const data = await response.json();
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Status updated successfully!",
          showConfirmButton: false,
          timer: 1500,
        });
        fetchOvertimeRequests();
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed to update status",
          text: data.message,
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire({
        icon: "error",
        title: "Error updating status",
        text: "An unexpected error occurred!",
      });
    }
  };

  const filteredAndSortedRequests = () => {
    return overtimeRequests
      .filter((req) =>
        statusFilter === "All" ? true : req.status === statusFilter
      )
      .sort((a, b) =>
        sortAscending
          ? new Date(a.date_requested) - new Date(b.date_requested)
          : new Date(b.date_requested) - new Date(a.date_requested)
      );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRequests(
        new Set(filteredAndSortedRequests().map((r) => r.request_id))
      );
    } else {
      setSelectedRequests(new Set());
    }
  };

  const handleSelectRequest = (id) => {
    const updated = new Set(selectedRequests);
    updated.has(id) ? updated.delete(id) : updated.add(id);
    setSelectedRequests(updated);
  };

  const handleDeleteSelected = async () => {
    const confirmed = await Swal.fire({
      title: "Are you sure?",
      text: "This will delete all selected requests!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete them!",
    });
    if (confirmed.isConfirmed) {
      try {
        const ids = Array.from(selectedRequests);
        const promises = ids.map((id) =>
          fetch(`${BASE_URL}/overtime/delete_overtime_request.php`, {
            method: "DELETE",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ request_id: id }),
          })
        );
        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map((r) => r.json()));
        if (results.every((r) => r.success)) {
          Swal.fire({
            icon: "success",
            title: "Deleted successfully!",
            showConfirmButton: false,
            timer: 1500,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Some deletions failed.",
          });
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Error deleting requests",
        });
      } finally {
        setSelectedRequests(new Set());
        fetchOvertimeRequests();
      }
    }
  };

  const countRequestsByStatus = () => {
    const counts = { Pending: 0, Approved: 0, Rejected: 0 };
    overtimeRequests.forEach((r) => {
      if (r.status in counts) counts[r.status]++;
    });
    return counts;
  };

  const requestCounts = countRequestsByStatus();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container w-full gap-y-4 p-3">
      <OvertimeFilter
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        requestCounts={requestCounts}
      />

      <div className="flex items-center mb-2">
        <Checkbox
          checked={selectedRequests.size === filteredAndSortedRequests().length}
          onChange={handleSelectAll}
        />
        <span className="ml-2">Select All</span>

        <div className="flex items-center ml-auto gap-2">
          {!permLoading && permissions.can_delete && (
            <button
              onClick={handleDeleteSelected}
              disabled={!selectedRequests.size}
              className="p-1 border rounded hover:bg-red-100"
            >
              <Trash2 size={20} />
            </button>
          )}

          <OvertimeSorting
            statusFilter={statusFilter}
            sortAscending={sortAscending}
            onStatusChange={setStatusFilter}
            onSortChange={setSortAscending}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
        {filteredAndSortedRequests().length === 0 ? (
          <div className="text-center w-full text-gray-500 italic">
            No overtime requests for{" "}
            <span className="font-semibold">{statusFilter}</span>.
          </div>
        ) : (
          filteredAndSortedRequests().map((r) => (
            <Card
              key={r.request_id}
              sx={{
                width: 335,
                backgroundColor:
                  r.status === "Approved"
                    ? "#e9f7ef"
                    : r.status === "Rejected"
                    ? "#fdecea"
                    : "#fffde7",
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center mb-2">
                  <Checkbox
                    checked={selectedRequests.has(r.request_id)}
                    onChange={() => handleSelectRequest(r.request_id)}
                    size="small"
                  />
                  <strong>{r.employee_name}</strong>
                  <span
                    className={`ml-2 w-3 h-3 rounded-full ${
                      r.status === "Approved"
                        ? "bg-green-500"
                        : r.status === "Rejected"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  />
                </div>

                <Typography variant="body2" color="text.secondary">
                  ID: <strong>{r.employee_id}</strong>
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="break-words whitespace-pre-wrap"
                >
                  Reason: <strong>{r.reason || "No reason provided"}</strong>
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Typography variant="body2" color="text.secondary">
                  Request Date:{" "}
                  <strong>
                    {new Date(r.date_requested).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </strong>
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Time start:{" "}
                  <strong>
                    {new Date(`1970-01-01T${r.time_start}`).toLocaleTimeString(
                      [],
                      { hour: "numeric", minute: "2-digit" }
                    )}{" "}
                    | Time end:{" "}
                    {new Date(`1970-01-01T${r.end_time}`).toLocaleTimeString(
                      [],
                      { hour: "numeric", minute: "2-digit" }
                    )}
                  </strong>
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Credit:{" "}
                  <strong>
                    {r.hours_requested} | {r.minutes_requested} min
                  </strong>
                </Typography>

                {!permLoading && permissions.can_edit && (
                  <div className="mt-2 text-sm">
                    <div className="font-semibold text-gray-600">Status</div>
                    <select
                      value={r.status}
                      onChange={(e) =>
                        updateStatus(r.request_id, e.target.value)
                      }
                      className="w-full p-1 mt-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default OvertimeRequest;
