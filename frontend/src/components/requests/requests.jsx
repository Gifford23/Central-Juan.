import React, { useState, useEffect } from "react";
import OvertimeRequest from "./overtime/overtimeRequest";
import '../../../Styles/components/requests/requests.css';
import NotificationRequestPage from "../admin_Late_request/index.jsx";
import { subscribeUser, unsubscribeUser } from '../../utils/pushHelper.js';
import BASE_URL from "../../../backend/server/config";
import ToggleButton from "./requestNotificationBudge/lataRequestAndOvertimerequest.jsx";
import SkipRequestsTable from "../loan/LoanSkipRequests/SkipRequestsTable.jsx";
import LeaveRequestPage from "../leave/leavePage/LeavePage.jsx";
import { useSession } from "../../context/SessionContext";

import usePermissions from "../../users/hooks/usePermissions"; 
const PUBLIC_VAPID_KEY = 'BIaBehbDRSgJte3RYzJY8WIJoXIww2biZLew_Ey3qEiymLj8BRRBeezmnMRDJv8CQHcetzR-opvvmRqBPy5981Y';

const Requests = () => {
  const { user } = useSession();
  const { permissions, loading } = usePermissions(user?.username);
  const [activeView, setActiveView] = useState("attendance");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [latePending, setLatePending] = useState(0);
  const [overtimePending, setOvertimePending] = useState(0);
  const [skipPending, setSkipPending] = useState(0); // add this
  const [leavePending, setLeavePending] = useState(0);

  const handleViewChange = (view) => setActiveView(view);

  const handleNotificationToggle = async () => {
    try {
      if (!isSubscribed) {
        await subscribeUser(PUBLIC_VAPID_KEY);
      } else {
        await unsubscribeUser();
      }

      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setIsSubscribed(!!subscription);

      alert(!isSubscribed ? 'Push notifications enabled' : 'Push notifications disabled');
    } catch (err) {
      console.error(err);
      alert('Notification toggle failed');
    }
  };


  // Fetch pending request counts
  useEffect(() => {
    const fetchPendingCounts = async () => {
      try {
        // Late attendance
        const lateRes = await fetch(`${BASE_URL}/late_request_clockInOut/get_late_attendance_requests.php`);
        const lateData = await lateRes.json();
        if (lateData.success) {
          const pendingLate = lateData.data.filter(req => req.status === 'pending').length;
          setLatePending(pendingLate);
        }
        
const leaveRes = await fetch(`${BASE_URL}/leave_request_employee/leave_request.php`);
const leaveData = await leaveRes.json();
if (leaveData.success) {
  const pendingLeave = leaveData.data.filter(req => req.status?.toLowerCase() === 'pending').length;
  setLeavePending(pendingLeave);
}

        // Overtime
        const overtimeRes = await fetch(`${BASE_URL}/overtime/overtime_request.php`);
        const overtimeData = await overtimeRes.json();
        if (overtimeData.success) {
          const pendingOvertime = overtimeData.data.filter(req => req.status === 'Pending').length;
          setOvertimePending(pendingOvertime);
        }

// Loan Skip Request
const skipRes = await fetch(`${BASE_URL}/loan_skip_request_api/read_skip_request.php`);
const skipData = await skipRes.json();
if (skipData.success) {
  const pendingSkips = skipData.data.filter(req => req.status === 'pending').length;
  setSkipPending(pendingSkips);
}


      } catch (error) {
        console.error("Error fetching pending request counts", error);
      }
    };

    fetchPendingCounts();
  }, []);

  useEffect(() => {
    (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    })();
  }, []);

  return (
    <div className="request-container">
      <div className="flex flex-row w-full pb-3 pl-5 border-b-2 gap-x-4 place-items-end Glc-dashboard-bg-header">
        <span className="text-2xl font-semibold">Request</span>

        <div className="flex request-boxbutton">
          <> 
              {!loading && permissions?.attendance_request && (
                <ToggleButton
                  label="Attendance"
                  isActive={activeView === 'attendance'}
                  onClick={() => handleViewChange('attendance')}
                  badgeCount={latePending}
                />
              )}
          </>

            <> 
              {!loading && permissions?.overtime_request && (
                <ToggleButton
                  label="Overtime"
                  isActive={activeView === 'overtime'}
                  onClick={() => handleViewChange('overtime')}
                  badgeCount={overtimePending}
                />
              )}
          </>

            {/* <ToggleButton
              label="Skip"
              isActive={activeView === 'skip'}
              onClick={() => handleViewChange('skip')}
              badgeCount={skipPending}
            /> */}

            <> 
              {!loading && permissions?.leave_request && (
                <ToggleButton
                  label="Leave"
                  isActive={activeView === 'leave'}
                  onClick={() => handleViewChange('leave')}
                  badgeCount={leavePending}
                />
              )}
            </>
        </div>

        <div className="p-10 ml-auto">
          {/* <button
            onClick={handleNotificationToggle}
            className={`px-4 py-2 text-white rounded ${isSubscribed ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
          </button> */}
        </div>
      </div>

      {activeView === 'overtime' && (
        <div className="w-full h-full overflow-hidden">
          <OvertimeRequest />
        </div>
      )}

      {activeView === 'attendance' && (
        <div className="flex w-full h-full border rounded-lg">
          <NotificationRequestPage />
        </div>
      )}

{activeView === 'skip' && (
  <div className="w-full h-full overflow-hidden">
    <SkipRequestsTable />
  </div>
)}

{activeView === 'leave' && (
  <div className="w-full h-full overflow-hidden">
    <LeaveRequestPage />
  </div>
)}

    </div>
  );
};

export default Requests;




// import React, { useState } from "react";
// import OvertimeRequest from "./overtime/overtimeRequest";
// import '../../../Styles/components/requests/requests.css';
// import NotificationRequestPage from "../admin_Late_request/index.jsx";

// const Requests = () => {
//     const [Overtime, setOvertime] = useState(true);
//     const [Attendance, setAttendance] = useState(false);
//     const [activeView, setActiveView] = useState("overtime");

//     const handleOvertime = () => {
//         setActiveView("overtime");
//         setOvertime(true);
//         setAttendance(false);
//     }

//     const handleAttendance = () => {
//         setActiveView("attendance");
//         setAttendance(true);
//         setOvertime(false);
//     }
    
//     return (
//     <>
//         <div className="request-container">
//             <div className="flex flex-row w-full pb-3 pl-5 border-b-2 gap-x-4 place-items-end Glc-dashboard-bg-header">
//                 <span className="text-2xl font-semibold">Request</span>
//                 <div className="request-boxbutton">
//                     <div onClick={handleOvertime} 
//                         className={`request-button 
//                             ${activeView === 'overtime' ? 'bg-[#0080f0] text-[#f8f9fa]' : 'text-[#0088f0] bg-[#f8f9fa]'}
//                         `}
//                     >
//                         Overtime
//                     </div>
//                     <div onClick={handleAttendance} 
//                         className={`request-button
//                             ${activeView === 'attendance' ? 'bg-[#0080f0] text-[#f8f9fa]' : 'text-[#0088f0] bg-[#f8f9fa]'}
//                         `}
//                     >
//                         Attendance
//                     </div>
//                 </div>
//             </div>
                
//             { Overtime && (
//                 <div className="w-full h-full overflow-hidden">
//                     <OvertimeRequest />
//                 </div>
//             )}

//             { Attendance && (
//                 <div className="flex w-full h-full border rounded-lg">
//                     <NotificationRequestPage />
//                 </div>
//             )}
//         </div>
//     </>
//     );
// }   

// export default Requests;
