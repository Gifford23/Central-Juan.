import React, { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
import Swal from "sweetalert2"; // Import SweetAlert2
import BASE_URL from '../../../backend/server/config'; 
import DeductionModal from './deductionModal'; // Import the modal
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import { Plus } from "lucide-react"; // Import Plus icon from lucide-react
import { useSession } from "../../context/SessionContext";
// import usePermissions from "../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../users/hooks/usePermissions"; 
import { SquarePen, Trash2  } from 'lucide-react';
import IconButton from "../../../Styles/icons/IconButton";
const Deduction = () => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchContributions = () => {
    setLoading(true);
    fetch(`${BASE_URL}/deduction/deduction.php`)
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          // Convert id to number
          const formattedData = result.data.map(item => ({
            ...item,
            id: Number(item.id), // Ensure id is a number
          }));
          setData(formattedData);
        } else {
          setError(result.message);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch data");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContributions(); // Call function on mount
  }, []);

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const handleDeleteEmployee = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`${BASE_URL}/deduction/delete_deduction.php`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        })
          .then((response) => response.json())
          .then((result) => {
            if (result.success) {
              Swal.fire("Deleted!", "The deduction has been deleted.", "success");
              fetchContributions(); // Refresh the data
            } else {
              Swal.fire("Error", result.message, "error");
            }
          })
          .catch((err) => {
            console.error(err);
            Swal.fire("Error", "Failed to delete deduction", "error");
          });
      }
    });
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedRecord(null);
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hoursIn12 = (hours % 12) || 12; // Convert to 12-hour format
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hoursIn12}:${minutes} ${ampm}`;
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;


  const breadcrumbItems = [
    // { label: 'Home', path: '/' },
    { label: 'Utilities Dashboard', path: '/utilitiesdashboard' },
    { label: 'Deductions' },
  ];

  return (
    <div className="container gap-y-4">
      
      {/* Header Section */}
      <div className="flex flex-col gap-y-2 w-full pb-3 Glc-dashboard-bg-header border-b-2 pl-5 sticky">
        <span className="text-2xl font-semibold">Deductions</span>
        <Breadcrumbs items={breadcrumbItems} />
      </div>
{/* 
        <button
          className="payroll-header-buttons w-fit p-2"
          onClick={() => {
            setSelectedRecord(null); // Clear selected record for adding new deduction
            setModalOpen(true); // Open modal
          }}
        >
          Add Deduction
        </button> */}

        {!permLoading && permissions?.can_add && (
          <button
            className="employee-newheaderbuttons-solid
              items-center flex flex-row w-fit h-10 rounded-lg px-2 gap-x-2 cursor-pointer place-items-center
              group"
            onClick={() => {
              setSelectedRecord(null);
              setModalOpen(true);
            }}
          >
            <Plus size={25} fontWeight={20} className="transition-transform duration-400 ease-out group-hover:scale-130"/>
            <span className="font-semibold">Add Deduction</span>
          </button>
        )}



      <div className="table_container">
        <div className="table_wrapper"> 
          <table className="">
            <thead className='table_head Glc-tableheader '>
              <tr className="tr_box uppercase text-resize text-left ">
                {/* <th className="px-4 py-2 Glc-tableheader-text">id</th> */}
                <th className="px-4 py-2 Glc-tableheader-text">start_time</th>
                <th className="px-4 py-2 Glc-tableheader-text">end_time</th>
                <th className="px-4 py-2 Glc-tableheader-text">deduction</th>
                    {!permLoading && permissions?.can_edit ? (
                    <th className="px-4 py-2 Glc-tableheader-text text-center">Action</th>
                  ) : (
                    <th className="px-4 py-2 Glc-tableheader-text text-center"></th>
                  )}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-gray-300 
                    ${index % 2 === 0 ? "Glc-table-background-color2" : "Glc-table-background"}
                    ${index % 1 === 0 ? "Glc-table-bordertop" : ""}
                  `}
                >
                  {/* <td className="px-4 py-2 ">{item.id}</td> */}
                  <td className="px-4 py-2 " ><strong className='font-bold text-[15px]'>{formatTime(item.start_time)}</strong></td>
                  <td className="px-4 py-2 "><strong className='font-bold text-[15px]'>{formatTime(item.end_time)}</strong></td>
                  <td><strong className='font-bold text-[15px]'>{item.deduction}</strong></td>
                  <td className="px-4 py-2 gap-x-3">

                      {!permLoading && permissions?.can_edit && (
                        <IconButton 
                            title="Edit" 
                            variant="edit"
                            onClick={() => handleEdit(item)} 
                          >
                            <SquarePen />
                          </IconButton>
                        )}

                        {!permLoading && permissions?.can_delete && (
                        <IconButton 
                            title="Delete" 
                            variant="delete"
                            onClick={() => handleDeleteEmployee(item.id)} 
                          >
                            <Trash2 />
                          </IconButton>
                      )}        

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DeductionModal 
        isOpen={modalOpen}
        onRequestClose={handleModalClose}
        selectedRecord={selectedRecord}
        fetchContributions={fetchContributions}
      />
    </div>
  );
};

export default Deduction;
