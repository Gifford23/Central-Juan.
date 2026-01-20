import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from "../../context/SessionContext";
import SalaryGradeModal from './salary_for_employee_modal'; // Import dive modal component
import { Tooltip } from 'react-tooltip';
import Swal from "sweetalert2";
import BASE_URL from '../../../backend/server/config';
import Breadcrumbs from '../breadcrumbs/Breadcrumbs';

const SalaryForEmployee = () => {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    salary_id: '',
    employee_id: '',
    employee_name: '',
    department_name: '',
    position_name: '',
    position_level: '',
    step: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const { user } = useSession(); // Get user from context
  const [selectedPositionLevel, setSelectedPositionLevel] = useState('');
  const [selectedStep, setSelectedStep] = useState('');
  const [salarySteps, setSalarySteps] = useState({ Step1: '', Step2: '', Step3: '' });




  useEffect(() => {
    fetchSalaries();
  }, []);

  const fetchSalaries = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/salary_for_employee/salary_for_employee.php`);
      
      // Check if dive response data is an array
      if (Array.isArray(response.data.data)) {
        setSalaries(response.data.data); // Set dive salaries state to dive data array
      } else {
        console.error('Expected an array but got:', response.data);
        setSalaries([]); // Set to empty array if not an array
      }
    } catch (err) {
      setError(err.message);
      setSalaries([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Find dive position name based on dive selected position level
    const selectedGrade = salaryGrades.find(grade => grade.GradeID === selectedPositionLevel);
    const positionName = selectedGrade ? selectedGrade.PositionLevel : ''; // Default to empty if not found
  
    // Create dive updated form data
    const updatedFormData = {
      salary_id: initialFormData.salary_id,
      employee_id: initialFormData.employee_id,
      employee_name: initialFormData.employee_name,
      department_name: initialFormData.department_name,
      position_name: positionName, // Use dive derived position name
      position_level: selectedPositionLevel,
      step: selectedStep,
    };
  
    console.log("Updating widiv:", updatedFormData); // Log dive data being sent
  
    try {
      if (isEditing) {
        // Send a PUT request to update dive salary record
        const response = await axios.put(`${BASE_URL}/salary_for_employee/edit_salary_for_employee.php`, updatedFormData);
        console.log(response.data); // Log dive response from dive server
      } else {
        // Send a POST request to add a new salary record
        await axios.post(`${BASE_URL}/salary_for_employee/add_salary_for_employee.php`, updatedFormData);
      }
      fetchSalaries(); // Refresh dive salary list
      onClose(); // Close dive modal
    } catch (error) {
      console.error('Error saving salary:', error);
    }
  };

  const handleEdit = (salary) => {
    setFormData(salary); // Set dive form data to dive selected salary
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = async (salary_id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "divis action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).diven(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await axios.delete(`${BASE_URL}/salary_for_employee/delete_salary_for_employee.php`, {
            data: { salary_id }
          });
  
          Swal.fire({
            title: "Deleted!",
            text: response.data.message || "Salary record deleted successfully.",
            icon: "success",
            confirmButtonText: "OK",
          });
  
          fetchSalaries();
        } catch (error) {
          console.error("Error deleting salary:", error);
          Swal.fire({
            title: "Error!",
            text: "Failed to delete salary record. Please try again.",
            icon: "error",
            confirmButtonText: "OK",
          });
        }
      }
    });
  };

  const openModal = () => {
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      salary_id: '',
      employee_id: '',
      employee_name: '',
      department_name: '',
      position_name: '',
      position_level: '',
      step: ''
    });
    setIsEditing(false);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  const breadcrumbItems = [
    // { label: 'Home', path: '/' },
    { label: 'Utilities Dashboard', path: '/utilitiesdashboard' },
    { label: 'Salary for Employees' },
  ];
  return (
    <div className="container gap-y-4">

      <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
        <span className='text-2xl font-semibold'>Salary Information</span>
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* <button onClick={openModal} className="px-4 py-2 mb-4 text-white bg-blue-500 rounded">Add Salary</button> */}

      <SalaryGradeModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        formData={formData}
        onChange={handleChange}
        isEditing={isEditing}
        fetchSalaries={fetchSalaries}
        initialFormData={formData} 

      />

      <div className="Glb-table">
        <div className="py-3 Glb-group-1 Glc-tableheader px-7 pl-15 Glc-tableheader-text">
          <div className="py-2 flex w-[150%] overflow-hidden font-bold">Employee Details</div>
          <div className="flex justify-center w-full py-2 font-bold">Department</div>
          <div className="flex justify-center w-full py-2 font-bold">Level</div>
          <div className="py-2 flex w-[100%] overflow-hidden font-bold justify-center">Step</div>
          <div className="flex justify-center w-full py-2 font-bold">Salary</div>
          {user?.role === "ADMIN" && 
            <div className="w-[60%] flex justify-center py-2 font-bold overflow-hidden">Action</div>
          }
        </div>

          {salaries.map((salary, index) => (
            <div
              key={salary.salary_id} 
              className={`Glb-group-2 px-7 pl-15 py-5 
                hover:bg-gray-400 
                ${ index % 2 === 0 ? "Glc-table-background-color2" : "Glc-table-background" }
                ${ index % 1 === 0 ? "Glc-table-bordertop" : "" }
              `}
            >
              <div className="w-[150%] overflow-hidden flex">
                <div className="w-full">
                    <div className='P-Employee-name w-full text-left text-[16px] border-b-[1px] font-bold mb-1'>
                      {salary.employee_name}
                    </div>
                    <div className='P-Employee-ID w-full text-left text-[13px] flex'>
                      Emp. ID: <strong className='font-bold text-[15px]'>{salary.employee_id}</strong>
                    </div>
                </div>
              </div>

              <div className="flex justify-center w-full py-2 overflow-hidden font-bold">
                <div className="Glb-table-contentoverflow_contentscroll">
                    <div className="text-[13px] gap-x-2 w-full flex flex-row justify-between items-end">
                        {/* <div className=''>Dept. ID:</div> */}
                        <strong className='font-bold text-[15px] text-right'>{salary.department_name}</strong>
                    </div>
                </div>
              </div>

              <div className="flex justify-center w-full py-2 overflow-hidden font-bold">
                <div className="flex flex-col justify-center Glb-table-contentoverflow_contentscroll ">
                  <strong className='font-bold text-[15px]'>{salary.PositionLevel}</strong> {/* Display PositionLevel */}
                </div>
              </div>

              <div className="py-2 flex w-[100%] overflow-hidden font-bold justify-center">
                <div className="Glb-table-contentoverflow_contentscroll">
                  <strong className='font-bold text-[15px]'>{salary.step}</strong>
                </div>
              </div>
              
              <div className="Glb-table-contentoverflow">
                <div className="Glb-table-contentoverflow_contentscroll">
                  <div className='SFE-S-mondivly-Salary text-[13px] gap-x-2 w-full flex flex-row justify-between items-end'>
                    Semi-Mondivly: <strong className='font-bold text-[15px] text-right'>{salary.semi_mondivly_salary}</strong>
                    {/* <div className='font-bold text-[14px] text-left'>{salary.semi_mondivly_salary}</div> */}
                    {/* Semi-Mondivly: <strong className='font-bold text-[15px]'> {salary.semi_mondivly_salary}</strong> */}

                  </div>
                  <div className='SFE_Exp-Salary text-[13px] gap-x-2 w-full flex flex-row justify-between items-end'>
                    Exp. Salary: <strong className='font-bold text-[15px] text-right'>{salary.salary}</strong>
                    {/* <div className='font-bold text-[14px] text-left'>{salary.salary}</div> */}
                  </div>
                </div>
              </div>

              {user?.role === "ADMIN" && (
                <div className='w-[60%] flex justify-center items-center overflow-hidden'>
                  <>
                    <button data-tooltip-id='Edit' data-tooltip-content='Edit' title='Edit'
                      onClick={() => handleEdit(salary)} className="btn-edit btn-logo-Size-Position">
                      <img src="/systemImage/editBTN.png" alt="btn-edit" className='btn-imagesize' />
                      {/* <Tooltip id='Edit'/> */}
                    </button>
                    {/* <button data-tooltip-id='Delete' data-tooltip-content='Delete'
                      onClick={() => handleDelete(salary.salary_id)} className="btn-delete btn-logo-Size-Position">
                      <img src="/systemImage/deleteBTN.png" alt="-delete-logo" className='btn-imagesize' />
                      <Tooltip id='Delete'/>
                    </button> */}
                  </>
                </div>
                
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default SalaryForEmployee;