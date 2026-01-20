// WA NI PULOS NA PAGE
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import HolidaysModal from "./HolidaysModal";
import BASE_URL from '../../../backend/server/config';
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import { useSession } from "../../context/SessionContext";
// import usePermissions from "../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../users/hooks/usePermissions";
const HolidaysList = () => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.role);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/philippine_holidays/philippine_holidays.php`);
      const data = await response.json();

      if (data.success) {
        setHolidays(data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Failed to fetch holiday records",
        });
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "An error occurred while fetching holiday data.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
    });

    if (result.isConfirmed) {
      const response = await fetch(`${BASE_URL}/philippine_holidays/delete_philippine_holidays.php`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      if (data.success) {
        Swal.fire("Deleted!", "Holiday has been deleted.", "success");
        fetchHolidays();
      } else {
        Swal.fire("Error!", data.message || "Failed to delete holiday.", "error");
      }
    }
  };

  const openModal = (holiday = null) => {
    setSelectedHoliday(holiday);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedHoliday(null);
    setModalOpen(false);
    fetchHolidays();
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

const breadcrumbItems = [
  !permLoading && permissions?.leave_type && { label: 'Leave Types', path: '/LeaveTypePage' },
  !permLoading && permissions?.overtime && { label: 'Overtime', path: '/overtime' },
  !permLoading && permissions?.holiday && { label: 'Holidays', path: '/holidays' },
  !permLoading && permissions?.leave_balances && { label: 'Leave Balance', path: '/LeaveBalancePage' },
  !permLoading && permissions?.schedule_settings && { label: 'Work Time Settings', path: '/WorkTimeSettings' },
].filter(Boolean); // remove any falsy (unauthorized) entries
 

  return (
    <div>
      <div className="sticky flex flex-col w-full pb-3 pl-5 mb-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
        <span className='text-2xl font-semibold'>Philippine Holidays</span>
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <div className="p-5 pt-0">
        {/* <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">Philippine Holidays</h2> */}
        {!permLoading && permissions.can_add && (
        <button onClick={() => openModal()} className="px-4 py-2 mb-4 text-white bg-blue-600 rounded">Add Holiday</button>
        )}

        {loading ? (
          <p className="text-center text-gray-600">Loading...</p>
        ) : holidays.length === 0 ? (
          <p className="text-center text-gray-500">No holidays found.</p>
        ) : (
          <div className="w-full overflow-x-auto border rounded-lg shadow-md">
            <table className="min-w-full text-sm text-gray-700 bg-white">
              <thead className="text-white bg-blue-600">
                <tr>
                  <th className="px-4 py-3 text-left">Holiday Name</th>
                  <th className="px-4 py-3 text-left">Holiday Date</th>
                  <th className="px-4 py-3 text-left">Credited Days</th>
                  <th className="px-4 py-3 text-left">Holiday Type</th>

                {!permLoading && permissions.can_edit && (
                  <th className="px-4 py-3 text-left">Actions</th>
                )}

                </tr>
              </thead>
              <tbody>
                {holidays.map((holiday) => (
                  <tr key={holiday.id} className="transition-colors hover:bg-gray-100">
                    <td className="px-4 border-t py -2">{holiday.holiday_name}</td>
                    <td className="px-4 py-2 border-t">{holiday.holiday_date}</td>
                    <td className="px-4 py-2 border-t">{holiday.credited_days}</td>
                    <td className="px-4 py-2 border-t">{holiday.holiday_type}</td>
                    <td className="px-4 py-2 border-t">

                    {!permLoading && permissions.can_edit && (
                      <button onClick={() => openModal(holiday)} className="text-blue-600 hover:underline">Edit</button>
                    )}
                    {!permLoading && permissions.can_add && (
                      <button onClick={() => handleDelete(holiday.id)} className="ml-2 text-red-600 hover:underline">Delete</button>
                    )}
                    
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <HolidaysModal isOpen={modalOpen} onClose={closeModal} holiday={selectedHoliday} onSave={fetchHolidays} />
      </div>
    </div>
  );
};

export default HolidaysList;