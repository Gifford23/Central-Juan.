import React, { useState } from "react";
import Swal from "sweetalert2";
import { useLateRequests } from "../hooks/uselateRequestAdmin";
import LateRequestCard from "../components/LateRequestCard";
import StatusSummary from "../components/commons/statusSummaryLateAtt";
import AttendanceRequestActions from "../components/commons/requestActionButton";

const LateRequestPage = () => {
  const { lateRequests, loading, updateStatus, deleteRequests } = useLateRequests();
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);

  const handleCheckboxChange = (requestId) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleToggleSort = (value) => {
    setSortAscending(value);
  };

  const handleDeleteSelected = async () => {
    if (selectedRequests.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Selection",
        text: "Please select requests to delete.",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${selectedRequests.length} request(s). This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        const response = await deleteRequests(selectedRequests);
        if (response.success) {
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Selected requests have been deleted.",
            timer: 2000,
            showConfirmButton: false,
          });
          setSelectedRequests([]);
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to delete requests: " + response.message,
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Error deleting requests: " + error.message,
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const normalizeStatus = (rawStatus) => {
    const status = rawStatus?.toLowerCase();
    if (status === "approve") return "Approved";
    if (status === "reject") return "Rejected";
    if (["approved", "pending", "rejected"].includes(status))
      return status.charAt(0).toUpperCase() + status.slice(1);
    return "Unknown";
  };

  if (loading) return <div>Loading...</div>;

  const statusCounts = lateRequests.reduce(
    (counts, request) => {
      const label = normalizeStatus(request.status);
      counts[label] = (counts[label] || 0) + 1;
      counts.Total += 1;
      return counts;
    },
    { Pending: 0, Approved: 0, Rejected: 0, Total: 0 }
  );

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      const allIds = filteredRequests.map((r) => r.request_id);
      setSelectedRequests(allIds);
    }
  };

  const filteredRequests =
    selectedStatus === "All"
      ? lateRequests
      : lateRequests.filter((r) => normalizeStatus(r.status) === selectedStatus);

  return (
    <div className="flex flex-col w-full h-full px-4 py-8 my-1">
      <StatusSummary
        counts={statusCounts}
        activeStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
      />

      <AttendanceRequestActions
        onSelectAll={handleSelectAll}
        isAllSelected={
          selectedRequests.length === filteredRequests.length &&
          filteredRequests.length > 0
        }
        onDeleteSelected={handleDeleteSelected}
        isDeleteDisabled={selectedRequests.length === 0}
        sortAscending={sortAscending}
        onToggleSort={handleToggleSort}
      />

      {/* {selectedRequests.length > 0 && (
        <button
          onClick={handleDeleteSelected}
          className={`px-4 py-2 mb-4 text-white bg-red-500 rounded hover:bg-red-600 ${
            isDeleting ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete Selected"}
        </button>
      )} */}

      <div className="flex-grow py-4 my-4 overflow-y-auto">
        {filteredRequests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...filteredRequests]
              .sort((a, b) => {
                const dateA = new Date(a.attendance_date);
                const dateB = new Date(b.attendance_date);
                return sortAscending ? dateA - dateB : dateB - dateA;
              })
              .map((request) => (
                <LateRequestCard
                  key={request.request_id}
                  request={request}
                  onStatusChange={updateStatus}
                  isChecked={selectedRequests.includes(request.request_id)}
                  onCheckboxChange={() =>
                    handleCheckboxChange(request.request_id)
                  }
                />
              ))}
          </div>
        ) : (
          <p className="mt-4 text-center text-gray-600">
            No late attendance requests for <strong>{selectedStatus}</strong>.
          </p>
        )}
      </div>
    </div>
  );
};

export default LateRequestPage;
