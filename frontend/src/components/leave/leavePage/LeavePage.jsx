import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { fetchLeaveRequests, updateLeaveRequest, deleteLeaveRequest } from "../leaveApi/useLeaveAPI";
import StatusSummary from "../../admin_Late_request/components/commons/statusSummaryLateAtt";
import AttendanceRequestActions from "../../admin_Late_request/components/commons/statusSummaryLateAtt";
import LeaveRequestCard from "../leaveComponents/LeaveRequestCard";

const LeaveRequestPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const [sortAscending, setSortAscending] = useState(true);
  const [loading, setLoading] = useState(true);

  // ✅ Get logged-in approver ID (adjust based on how you store it)
  const currentUserId = localStorage.getItem("employee_id"); 

  const loadData = async () => {
    setLoading(true);
    const res = await fetchLeaveRequests();
    if (Array.isArray(res)) {
      setLeaveRequests(res);
    } else if (Array.isArray(res?.data)) {
      setLeaveRequests(res.data);
    } else {
      setLeaveRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckboxChange = (id) => {
    setSelectedRequests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedRequests.length === 0) {
      Swal.fire({ icon: "warning", title: "No Selection", text: "Select requests to delete." });
      return;
    }
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${selectedRequests.length} leave request(s)?`,
      icon: "warning",
      showCancelButton: true,
    });
    if (!result.isConfirmed) return;
    for (let id of selectedRequests) {
      await deleteLeaveRequest(id);
    }
    Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
    setSelectedRequests([]);
    loadData();
  };

  const handleStatusChange = async (id, newStatus) => {
    const payload = {
      leave_id: id,
      status: newStatus.toLowerCase(),
      approver_id: currentUserId,
      approval_remarks: newStatus === "rejected" ? "Rejected by HR" : "Approved by HR",
    };

    await updateLeaveRequest(payload);
    loadData();
  };

  const normalizeStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "pending":
        return "Pending";
      default:
        return "Unknown";
    }
  };

  const filteredRequests =
    selectedStatus === "All"
      ? leaveRequests
      : leaveRequests.filter((r) => normalizeStatus(r.status) === selectedStatus);

  const statusCounts = leaveRequests.reduce(
    (acc, r) => {
      const label = normalizeStatus(r.status);
      acc[label] = (acc[label] || 0) + 1;
      acc.Total += 1;
      return acc;
    },
    { Pending: 0, Approved: 0, Rejected: 0, Total: 0 }
  );

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map((r) => r.leave_id));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col w-full px-4 py-8">
      <StatusSummary
        counts={statusCounts}
        activeStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
      />

      {/* <AttendanceRequestActions
        onSelectAll={handleSelectAll}
        isAllSelected={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
        onDeleteSelected={handleDeleteSelected}
        isDeleteDisabled={selectedRequests.length === 0}
        sortAscending={sortAscending}
        onToggleSort={setSortAscending}
      /> */}
      <div
        className="grid grid-cols-1 gap-4 py-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-4"
        style={{ maxHeight: "70vh" }}
      >
        {[...filteredRequests]
          .sort((a, b) => {
            const dateA = new Date(a.date_from);
            const dateB = new Date(b.date_from);
            return sortAscending ? dateA - dateB : dateB - dateA;
          })
          .map((req) => (
            <LeaveRequestCard
              key={req.leave_id}
              request={req}
              isChecked={selectedRequests.includes(req.leave_id)}
              onCheckboxChange={() => handleCheckboxChange(req.leave_id)}
              onStatusChange={handleStatusChange}
            />
          ))}
      </div>
    </div>
  );
};

export default LeaveRequestPage;





// import React, { useState, useEffect } from "react";
// import Swal from "sweetalert2";
// import { fetchLeaveRequests, updateLeaveRequest, deleteLeaveRequest } from "../leaveApi/useLeaveAPI";
// import StatusSummary from "../../admin_Late_request/components/commons/statusSummaryLateAtt";
// import AttendanceRequestActions from '../../admin_Late_request/components/commons/statusSummaryLateAtt'
// import LeaveRequestCard from "../leaveComponents/LeaveRequestCard";

// const LeaveRequestPage = () => {
//   const [leaveRequests, setLeaveRequests] = useState([]);
//   const [selectedRequests, setSelectedRequests] = useState([]);
//   const [selectedStatus, setSelectedStatus] = useState("Pending");
//   const [sortAscending, setSortAscending] = useState(true);
//   const [loading, setLoading] = useState(true);

//   const loadData = async () => {
//     setLoading(true);
//     const res = await fetchLeaveRequests();
//     if (Array.isArray(res)) {
//       setLeaveRequests(res);
//     } else if (Array.isArray(res?.data)) {
//       setLeaveRequests(res.data);
//     } else {
//       setLeaveRequests([]);
//     }
//     setLoading(false);
//   };

//   useEffect(() => { loadData(); }, []);

//   const handleCheckboxChange = (id) => {
//     setSelectedRequests((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
//     );
//   };

//   const handleDeleteSelected = async () => {
//     if (selectedRequests.length === 0) {
//       Swal.fire({ icon: "warning", title: "No Selection", text: "Select requests to delete." });
//       return;
//     }
//     const result = await Swal.fire({
//       title: "Are you sure?",
//       text: `Delete ${selectedRequests.length} leave request(s)?`,
//       icon: "warning", showCancelButton: true,
//     });
//     if (!result.isConfirmed) return;
//     for (let id of selectedRequests) {
//       await deleteLeaveRequest(id);
//     }
//     Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
//     setSelectedRequests([]);
//     loadData();
//   };

// const handleStatusChange = async (id, newStatus) => {
//   const payload = {
//     leave_id: id,
//     status: newStatus,
//     approver_id: currentUserId, // <- set from logged-in user context/session
//     approval_remarks: newStatus === "Rejected" ? "Rejected by HR" : "Approved by HR"
//   };

//   await updateLeaveRequest({ 
//     leave_id: id, 
//     status: newStatus.toLowerCase(), 
//     approver_id: currentUserId 
//   });
//   loadData();
// };

// const normalizeStatus = (status) => {
//   switch (status?.toLowerCase()) {
//     case "approved": return "Approved";
//     case "rejected": return "Rejected";
//     case "pending": return "Pending";
//     default: return "Unknown";
//   }
// };


//   const filteredRequests = selectedStatus === "All"
//     ? leaveRequests
//     : leaveRequests.filter((r) => normalizeStatus(r.status) === selectedStatus);

//   const statusCounts = leaveRequests.reduce(
//     (acc, r) => {
//       const label = normalizeStatus(r.status);
//       acc[label] = (acc[label] || 0) + 1;
//       acc.Total += 1;
//       return acc;
//     }, { Pending:0, Approved:0, Rejected:0, Total:0 }
//   );

//   const handleSelectAll = () => {
//     if (selectedRequests.length === filteredRequests.length) {
//       setSelectedRequests([]);
//     } else {
//       setSelectedRequests(filteredRequests.map(r => r.leave_id));
//     }
//   };

//   if (loading) return <div>Loading...</div>;

//   return (
//     <div className="flex flex-col w-full px-4 py-8">
//       <StatusSummary
//         counts={statusCounts}
//         activeStatus={selectedStatus}
//         onSelectStatus={setSelectedStatus}
//       />

//       {/* <AttendanceRequestActions
//         onSelectAll={handleSelectAll}
//         isAllSelected={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
//         onDeleteSelected={handleDeleteSelected}
//         isDeleteDisabled={selectedRequests.length === 0}
//         sortAscending={sortAscending}
//         onToggleSort={setSortAscending}
//       /> */}

// <div
//     className="grid grid-cols-1 gap-4 py-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-4"
//     style={{ maxHeight: "70vh" }} // adjust this to fit your layout
//   >
//     {[...filteredRequests]
//       .sort((a, b) => {
//         const dateA = new Date(a.date_from);
//         const dateB = new Date(b.date_from);
//         return sortAscending ? dateA - dateB : dateB - dateA;
//       })
//       .map((req) => (
//         <LeaveRequestCard
//           key={req.leave_id}
//           request={req}
//           isChecked={selectedRequests.includes(req.leave_id)}
//           onCheckboxChange={() => handleCheckboxChange(req.leave_id)}
//           onStatusChange={handleStatusChange}
//         />
//       ))}
//   </div>
//     </div>
//   );
// };

// export default LeaveRequestPage;
