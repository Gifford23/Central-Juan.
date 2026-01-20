import React, { useEffect } from "react";
import useLoanSkipAPI from "../loan_hooks/useLoanSkipAPI";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const SkipRequestsTable = () => {
  const {
    skipRequests,
    loading,
    error,
    fetchSkipRequests,
    updateSkipStatus,
    deleteSkipRequest,
  } = useLoanSkipAPI();

  const handleStatusChange = async (skip_id, newStatus) => {
    const confirmed = window.confirm(`Change status to ${newStatus}?`);
    if (!confirmed) return;

    const res = await updateSkipStatus(skip_id, newStatus);
    if (res.success) {
      fetchSkipRequests();
    } else {
      alert("Failed to update status: " + res.message);
    }
  };

  const handleDelete = async (skip_id) => {
    const confirmed = window.confirm("Delete this request?");
    if (!confirmed) return;

    const res = await deleteSkipRequest(skip_id);
    if (res.success) {
      fetchSkipRequests();
    } else {
      alert("Failed to delete: " + res.message);
    }
  };

  useEffect(() => {
    fetchSkipRequests();
  }, []);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="mb-4 text-lg font-semibold">Loan Skip Requests</h2>

      {loading ? (
        <p>Loading skip requests...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border rounded">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border">Employee ID</th>
                <th className="p-2 border">Loan ID</th>
                <th className="p-2 border">Cutoff</th>
                <th className="p-2 border">Reason</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Requested</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {skipRequests.map((req, index) => (
                <tr key={req.skip_id} className="hover:bg-gray-50">
                  <td className="p-2 text-center border">{index + 1}</td>
                  <td className="p-2 border">{req.employee_id}</td>
                  <td className="p-2 text-center border">{req.loan_id}</td>
                  <td className="p-2 border">{req.payroll_cutoff}</td>
                  <td className="p-2 border">{req.reason || "-"}</td>
                  <td className={`p-2 border text-center font-medium ${statusColors[req.status]}`}>
                    {req.status}
                  </td>
                  <td className="p-2 text-sm text-gray-500 border">{req.requested_at}</td>
                  <td className="p-2 space-x-1 text-center border">
                    {req.status === "pending" && (
                      <>
                        <button
                          className="px-2 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700"
                          onClick={() => handleStatusChange(req.skip_id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                          onClick={() => handleStatusChange(req.skip_id, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      className="px-2 py-1 text-xs text-gray-800 bg-gray-200 rounded hover:bg-gray-300"
                      onClick={() => handleDelete(req.skip_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {skipRequests.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-2 text-center text-gray-500 border">
                    No skip requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SkipRequestsTable;
