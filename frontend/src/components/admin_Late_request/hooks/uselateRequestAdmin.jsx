import { useState, useEffect } from "react";
import Swal from 'sweetalert2';
import { fetchLateRequests, updateLateRequestStatus, approveLateRequest, deleteSelectedRequestsAPI } from "../api/lateRequestAPI";

export const useLateRequests = () => {
    const [lateRequests, setLateRequests] = useState([]);
    const [loading, setLoading] = useState(true);
  
    const loadRequests = async () => {
        try {
            const data = await fetchLateRequests();
            setLateRequests(data);
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };
  
    const refreshRequests = () => {
        setLoading(true);
        loadRequests();
    };
  
    const updateStatus = async (requestId, newStatus) => {
        try {
            const res = await updateLateRequestStatus(requestId, newStatus);
            if (!res.success) throw new Error(res.message);
  
           if (newStatus === 'Approved') {
    const approvedRequest = lateRequests.find(req => req.request_id === requestId);
    await approveLateRequest({
        request_id: approvedRequest.request_id, // 🔧 Add this!
        employee_id: approvedRequest.employee_id,
        attendance_date: approvedRequest.attendance_date,
        requested_time_in_morning: approvedRequest.requested_time_in_morning,
        requested_time_out_morning: approvedRequest.requested_time_out_morning,
        requested_time_in_afternoon: approvedRequest.requested_time_in_afternoon,
        requested_time_out_afternoon: approvedRequest.requested_time_out_afternoon,
    });
}

  
            Swal.fire({ icon: 'success', title: `${newStatus} successfully`, timer: 1500, showConfirmButton: false });
            loadRequests();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        }
    };

    const deleteRequests = async (requestIds) => {
      try {
          const response = await deleteSelectedRequestsAPI(requestIds);
          
          if (response && response.success) {
              // Refresh late requests after successful deletion
              await loadRequests(); // Fetch updated data
          } else {
              throw new Error(response.message || "Unknown error during deletion.");
          }
          
          return response;
      } catch (error) {
          console.error("Failed to delete requests:", error);
          // Optionally refresh data even on error
          await loadRequests(); // Fetch updated data
          return { success: false, message: error.message };
      }
  };
  
  
    useEffect(() => {
        loadRequests();
    }, []);

    return { lateRequests, loading, updateStatus, deleteRequests, refreshRequests };  // <-- Expose refreshRequests
};



// import { useState, useEffect } from "react";
// import Swal from 'sweetalert2';
// import { fetchLateRequests, updateLateRequestStatus, approveLateRequest, deleteSelectedRequestsAPI   } from "../api/lateRequestAPI";


// export const useLateRequests = () => {
//     const [lateRequests, setLateRequests] = useState([]);
//     const [loading, setLoading] = useState(true);
  
//     const loadRequests = async () => {
//       try {
//         const data = await fetchLateRequests();
//         setLateRequests(data);
//       } catch (err) {
//         console.error(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };
  
//     const updateStatus = async (requestId, newStatus) => {
//       try {
//         const res = await updateLateRequestStatus(requestId, newStatus);
//         if (!res.success) throw new Error(res.message);
  
//         if (newStatus === 'Approved') {
//           const approvedRequest = lateRequests.find(req => req.request_id === requestId);
//           await approveLateRequest({
//             employee_id: approvedRequest.employee_id,
//             attendance_date: approvedRequest.attendance_date,
//             requested_time_in_morning: approvedRequest.requested_time_in_morning,
//             requested_time_out_morning: approvedRequest.requested_time_out_morning,
//             requested_time_in_afternoon: approvedRequest.requested_time_in_afternoon,
//             requested_time_out_afternoon: approvedRequest.requested_time_out_afternoon,
//           });
//         }
  
//         Swal.fire({ icon: 'success', title: `${newStatus} successfully`, timer: 1500, showConfirmButton: false });
//         loadRequests();
//       } catch (error) {
//         Swal.fire({ icon: 'error', title: 'Error', text: error.message });
//       }
//     };
//     const deleteRequests = async (requestIds) => {
//       try {
//           const response = await deleteSelectedRequestsAPI(requestIds);
          
//           if (response && response.success) {
//               // Refresh late requests after deletion
//               await loadRequests(); // Call loadRequests to refresh the data
//           } else {
//               throw new Error(response.message || "Unknown error during deletion.");
//           }
          
//           return response; // Return response for frontend to handle
//       } catch (error) {
//           console.error("Failed to delete requests:", error);
//           return { success: false, message: error.message }; // Provide error message for UI
//       }
//   };
  
  
  
//     useEffect(() => {
//       loadRequests();
//     }, []);


  
//     return { lateRequests, loading, updateStatus, deleteRequests };
//   };
