// Holiday_Page.jsx
import React, { useState } from "react";
import { useHolidays } from "./Holiday_hooks/Holiday_hooks";
import HolidayTable from "./Holiday_components/Holiday_table";
import HolidayModal from "./Holiday_UpdateAndCreate_modal";
import { useSession } from "../../context/SessionContext";
// import usePermissions from "../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../users/hooks/usePermissions"; 
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
const HolidayPage = () => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  const { holidays, loading, createHoliday, updateHoliday, deleteHoliday, fetchHolidays } = useHolidays();
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const handleEdit = (data) => {
    setEditData(data);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      await deleteHoliday(id);
      fetchHolidays();
    }
  };

  const handleSave = async (data) => {
    if (data.holiday_id) {
      await updateHoliday(data);
    } else {
      await createHoliday(data);
    }
    setShowModal(false);
    setEditData(null);
    fetchHolidays();
  };

const breadcrumbItems = [
  !permLoading && permissions?.leave_type && { label: 'Leave Types', path: '/LeaveTypePage' },
  !permLoading && permissions?.overtime && { label: 'Overtime', path: '/overtime' },
  !permLoading && permissions?.holiday && { label: 'Holidays', path: '/holidays' },
  !permLoading && permissions?.leave_balances && { label: 'Leave Balance', path: '/LeaveBalancePage' },
  !permLoading && permissions?.schedule_settings && { label: 'Work Time Settings', path: '/WorkTimeSettings' },
].filter(Boolean); // remove any falsy (unauthorized) entries

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">

          <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
            <span className='text-2xl font-semibold'>Holiday management</span>
              {/* <div className="hidden md:block"> */}
                <Breadcrumbs items={breadcrumbItems} />
              {/* </div> */}
            </div>

        {!permLoading && permissions.can_add && (
        <button onClick={() => setShowModal(true)} className="px-4 py-2 text-white bg-green-600 rounded">Add Holiday</button>
        )}
        
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <HolidayTable holidays={holidays} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      <HolidayModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSave={handleSave}
        defaultValues={editData}
      />
    </div>
  );
};

export default HolidayPage;


