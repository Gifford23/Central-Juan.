import React, { useEffect, useState } from "react";
import OvertimeModal from "./overtimeModal";
import BASE_URL from "../../../../backend/server/config";
import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";
import OvertimeTypeSettingsPage from "../../overtime_typre_settings/OT_type_page/OT_type_SettingsPage";
import { useSession } from "../../../context/SessionContext";
import usePermissions from "../../../users/hooks/usePermissions";
import { Pencil, Clock } from "lucide-react";
const Overtime = () => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);

  const [overtimeData, setOvertimeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOvertime, setSelectedOvertime] = useState(null);

  // format "HH:mm" to "h:mm AM/PM"
  const formatTimeTo12Hour = (time) => {
    if (!time) return "";
    const [hourStr, minuteStr] = time.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour === 0 ? 12 : hour;
    return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
  };

  useEffect(() => {
    const fetchOvertimeData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${BASE_URL}/overtime_settings/overtime_settings.php`
        );
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        if (data.success) setOvertimeData(data.data || []);
        else setError(data.message || "Failed to load overtime settings");
      } catch (err) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOvertimeData();
  }, []);

  const handleAddOrEdit = (overtime) => {
    if (overtime.overtime_id) updateOvertime(overtime);
    else addOvertime(overtime);
  };

  const addOvertime = async (overtime) => {
    try {
      const response = await fetch(
        `${BASE_URL}/overtime_settings/add_overtime_settings.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(overtime),
        }
      );
      const data = await response.json();
      if (data.success) {
        // optimistic add: backend should return created id ideally
        setOvertimeData((prev) => [...prev, { ...overtime, overtime_id: Date.now() }]);
      } else {
        console.warn("Add overtime failed:", data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsModalOpen(false);
    }
  };

  const updateOvertime = async (overtime) => {
    try {
      const response = await fetch(
        `${BASE_URL}/overtime_settings/update_overtime_settings.php`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(overtime),
        }
      );
      const data = await response.json();
      if (data.success) {
        setOvertimeData((prev) =>
          prev.map((it) => (it.overtime_id === overtime.overtime_id ? overtime : it))
        );
      } else {
        console.warn("Update overtime failed:", data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsModalOpen(false);
    }
  };

  const handleEditClick = (overtime) => {
    setSelectedOvertime(overtime);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedOvertime(null);
    setIsModalOpen(true);
  };

  // const breadcrumbItems = [
  //   { label: "Utilities Dashboard", path: "/utilitiesdashboard" },
  //   { label: "Overtime" },
  // ];
const breadcrumbItems = [
  !permLoading && permissions?.leave_type && { label: 'Leave Types', path: '/LeaveTypePage' },
  !permLoading && permissions?.overtime && { label: 'Overtime', path: '/overtime' },
  !permLoading && permissions?.holiday && { label: 'Holidays', path: '/holidays' },
  !permLoading && permissions?.leave_balances && { label: 'Leave Balance', path: '/LeaveBalancePage' },
  !permLoading && permissions?.schedule_settings && { label: 'Work Time Settings', path: '/WorkTimeSettings' },
].filter(Boolean); // remove any falsy (unauthorized) entries


  return (
    <>
      <div className="w-full space-y-6">
  <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
            <span className='text-2xl font-semibold'>Overtime Settings</span>
              {/* <div className="hidden md:block"> */}
                <Breadcrumbs items={breadcrumbItems} />
              {/* </div> */}
            </div>


        {/* Controls */}
        <div className="px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Manage overtime start times used by your system.
            </p>

            {/* Add button if allowed */}
            {/* {!permLoading && permissions?.can_edit && (
              <div className="flex gap-2">
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white transition bg-blue-600 rounded-full shadow-sm hover:bg-blue-700"
                  aria-label="Add overtime"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Overtime
                </button>
              </div>
            )} */}
          </div>
        </div>

        {/* Content */}
        <div className="px-4">
          {loading ? (
            <div className="p-6 text-center text-gray-500 bg-white rounded-lg shadow-sm">Loading overtime settings...</div>
          ) : error ? (
            <div className="p-6 text-red-700 border border-red-100 rounded-lg bg-red-50">{error}</div>
          ) : overtimeData.length === 0 ? (
            <div className="p-6 text-center text-gray-500 bg-white rounded-lg shadow-sm">
              No overtime settings found.
            </div>
          ) : (
            // responsive grid: 1 col on mobile, 2 on md, 3 on lg
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {overtimeData.map((ot) => (
                <article key={ot.overtime_id} className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-50">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Overtime Start</p>
                        <p className="mt-1 text-lg font-semibold text-gray-800">
                          {formatTimeTo12Hour(ot.overtime_start)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      {/* Edit button */}
                      {!permLoading && permissions?.can_edit && (
                        <button
                          onClick={() => handleEditClick(ot)}
                          className="inline-flex items-center justify-center p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none"
                          aria-label={`Edit overtime ${formatTimeTo12Hour(ot.overtime_start)}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Optional details area (expandable in future) */}
                  {/* <div className="px-4 pb-4">
                    <div className="text-xs text-gray-500">ID</div>
                    <div className="text-sm font-medium text-gray-700">{ot.overtime_id}</div>
                  </div> */}
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Overtime types settings (kept as originally placed) */}
        <div className="px-4">
          <OvertimeTypeSettingsPage />
        </div>
      </div>

      {/* Modal */}
      <OvertimeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOvertime(null);
        }}
        onSubmit={handleAddOrEdit}
        overtimeData={selectedOvertime}
      />
    </>
  );
};

export default Overtime;




// import React, { useEffect, useState } from 'react';
// import OvertimeModal from './OvertimeModal'; // Import the modal component
// import BASE_URL from '../../../../backend/server/config';
// import Breadcrumbs from '../../breadcrumbs/Breadcrumbs';
// import OvertimeTypeSettingsPage from '../../overtime_typre_settings/OT_type_page/OT_type_SettingsPage';
// import { useSession } from "../../../context/SessionContext";
// // import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
// import usePermissions from "../../../users/hooks/usePermissions"; 

// const Overtime = () => {
//   const { user } = useSession(); 
//   const { permissions, loading: permLoading } = usePermissions(user?.username);
//   const [overtimeData, setOvertimeData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedOvertime, setSelectedOvertime] = useState(null);



//   const formatTimeTo12Hour = (time) => {
//     if (!time) return '';
//     const [hourStr, minuteStr] = time.split(':');
//     let hour = parseInt(hourStr, 10);
//     const minute = parseInt(minuteStr, 10);
//     const ampm = hour >= 12 ? 'PM' : 'AM';
//     hour = hour % 12;
//     hour = hour === 0 ? 12 : hour;
//     return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
//   };
   


//   useEffect(() => {
//     const fetchOvertimeData = async () => {
//       try {
//         const response = await fetch(`${BASE_URL}/overtime_settings/overtime_settings.php`);
//         if (!response.ok) {
//           throw new Error('Network response was not ok');
//         }
//         const data = await response.json();
//         if (data.success) {
//           setOvertimeData(data.data);
//         } else {
//           setError(data.message);
//         }
//       } catch (error) {
//         setError(error.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchOvertimeData();
//   }, []);

//   const handleAddOrEdit = (overtime) => {
//     if (overtime.overtime_id) {
//       // Update existing overtime
//       updateOvertime(overtime);
//     } else {
//       // Add new overtime
//       addOvertime(overtime);
//     }
//   };

//   const addOvertime = async (overtime) => {
//     const response = await fetch(`${BASE_URL}/overtime_settings/add_overtime_settings.php`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(overtime),
//     });
//     const data = await response.json();
//     if (data.success) {
//       setOvertimeData((prev) => [...prev, { ...overtime, overtime_id: Date.now() }]); // Add new overtime to state
//     }
//     setIsModalOpen(false);
//   };

// //   const handleDelete = async (overtimeId) => {
// //     const confirmDelete = window.confirm('Are you sure you want to delete this overtime setting?');
// //     if (confirmDelete) {
// //       try {
// //         const response = await fetch(`http://localhost/central_juan/backend/overtime_settings/delete_overtime_settings.php`, {
// //           method: 'DELETE',
// //           headers: {
// //             'Content-Type': 'application/json',
// //           },
// //           body: JSON.stringify({ overtime_id: overtimeId }), // send as JSON in body
// //         });
  
// //         const data = await response.json();
// //         if (data.success) {
// //           setOvertimeData((prev) => prev.filter((item) => item.overtime_id !== overtimeId));
// //         } else {
// //           alert(data.message);
// //         }
// //       } catch (error) {
// //         console.error('Error deleting overtime:', error);
// //         alert('Failed to delete. Check your server or network.');
// //       }
// //     }
// //   };
  

//   const updateOvertime = async (overtime) => {
//     const response = await fetch(`${BASE_URL}/overtime_settings/update_overtime_settings.php`, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(overtime),
//     });
//     const data = await response.json();
//     if (data.success) {
//       setOvertimeData((prev) => prev.map((item) => (item.overtime_id === overtime.overtime_id ? overtime : item)));
//     }
//     setIsModalOpen(false);
//   };

//   const handleEditClick = (overtime) => {
//     setSelectedOvertime(overtime);
//     setIsModalOpen(true);
//   };



//   if (loading) {
//     return <div>Loading...</div>;
//   }

//   if (error) {
//     return <div>Error: {error}</div>;
//   }

//   const breadcrumbItems = [
//     // { label: 'Home', path: '/' },
//     { label: 'Utilities Dashboard', path: '/utilitiesdashboard' },
//     { label: 'Overtime' },
//   ];

//   return (
// <>

//     <div>

//       <div className="sticky flex flex-col w-full pb-3 pl-5 mb-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
//         <span className='text-2xl font-semibold'>Overtime Settings</span>
//         <Breadcrumbs items={breadcrumbItems} />
//       </div>

//       {/* <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Overtime Settings</h2> */}
//       {/* <button onClick={handleAddClick} style={{ marginBottom: '1rem', backgroundColor: '#22c55e', color: 'white', padding: '0.5rem', borderRadius: '0.375rem' }}>Add Overtime</button> */}
//       {overtimeData.length > 0 ? (
//         <table style={{ minWidth: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db' }}>
//           <thead>
//             <tr style={{ backgroundColor: '#e5e7eb' }}>
//               {/* <th style={{ border: '1px solid #d1d5db', padding: '0.5rem 1rem' }}>Overtime ID</th> */}
//               <th style={{ border: '1px solid #d1d5db', padding: '0.5rem 1rem' }}>Overtime Start</th>

//               {!permLoading && permissions.can_edit && (
//                 <th style={{ border: '1px solid #d1d5db', padding: '0.5rem 1rem' }}>Action</th>
//               )}

//             </tr>
//           </thead>
//           <tbody>
//             {overtimeData.map((overtime) => (
//               <tr key={overtime.overtime_id} style={{ borderBottom: '1px solid #d1d5db' }}>
//                 {/* <td style={{ border: '1px solid #d1d5db', padding: '0.5rem 1rem' }}>{overtime.overtime_id}</td> */}
//                 <td style={{ border: '1px solid #d1d5db', padding: '0.5rem 1rem' }}>{formatTimeTo12Hour(overtime.overtime_start)} </td>
                
               
//                 <td style={{ border: '1px solid #d1d5db', padding: '0.5rem 1rem' }}>
// {!permLoading && permissions.can_edit && (

//                   <button 
//                     onClick={() => handleEditClick(overtime)} 
//                     style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}
//                   >
//                     Edit
//                   </button>
// )}
//                   {/* <button 
//                     type="button" 
//                     onClick={() => handleDelete(overtime.overtime_id)} 
//                     style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem', borderRadius: '0.375rem', marginLeft: '0.5rem' }}
//                   >
//                     Delete
//                   </button> */}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       ) : (
//         <div>No overtime settings found.</div>
//       )}
//       <OvertimeModal 
//         isOpen={isModalOpen} 
//         onClose={() => setIsModalOpen(false)} 
//         onSubmit={handleAddOrEdit} 
//         overtimeData={selectedOvertime} 
//       />
//     </div>

//     <div>
//       <OvertimeTypeSettingsPage/>
//     </div>

// </>        
//   );
  
// };

// export default Overtime;