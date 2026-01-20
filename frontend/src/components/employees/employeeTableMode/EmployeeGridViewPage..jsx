import React, { useState, useEffect } from 'react';
import Swal from "sweetalert2";
import EmployeeGridView from './employeeGridView';
import BASE_URL from '../../../../backend/server/config'; 
import { useSession } from '../../../context/SessionContext';
import { useLocation, useOutletContext } from 'react-router-dom';
import EmployeeModalButton from '../employeeComponents/emplpyeeAddModalBTN';
import EmployeeModal from '../EmployeeModal';
import EmployeeListView from './employeeListView';
import { addEmployee, updateEmployee} from  '../employeeAPI/employeeAPI';

import EmployeeActionsDropdown from '../employeeComponents/EmployeeActionDropdown';


const EmployeeGridViewPage = () => {
  const { user } = useSession(); // get user from outlet context

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // ✅ FIXED
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${BASE_URL}/employeesSide/employees.php`);
        const data = await response.json();
        // console.log("Fetched employees:", data); // Log the fetched data
        if (data.message) {
          alert(data.message);
        } else {
          setEmployees(data);
        }
      } catch (error) {
        alert("Error fetching employee data. Please try again later.");
        console.error("Error fetching employee data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

const handleEditEmployee = (employee) => {
  setSelectedEmployee(employee);      // Set the selected employee to edit
  setIsModalOpen(true);               // Open the modal
};

  const handleDeleteEmployee = async (employee_id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_URL}/employeesSide/delete_employee.php?id=${employee_id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        setEmployees((prevEmployees) => prevEmployees.filter(emp => emp.employee_id !== employee_id));
        Swal.fire({
          title: "Deleted!",
          text: "Employee has been deleted successfully.",
          icon: "success",
          confirmButtonColor: "#3085d6",
        });
      } else {
        Swal.fire({
          title: "Error!",
          text : data.message || "Failed to delete employee.",
          icon: "error",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      Swal.fire({
        title: "Error!",
        text: "Something went wrong. Please try again later.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedEmployees(employees.map(emp => emp.employee_id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
    );
  };

  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.first_name} ${employee.middle_name || ""} ${employee.last_name}`.toLowerCase();
    return (
      employee.employee_id.toString().includes(searchQuery.toLowerCase()) ||
      fullName.includes(searchQuery.toLowerCase())
    );
  });


const handleAddEmployee = async (newEmployee, mode = 'add') => {
  const result = mode === 'update'
    ? await updateEmployee(newEmployee)
    : await addEmployee(newEmployee);
        
        if (result.success) {
            alert(result.message);
            setIsModalOpen(false);
        } else {
            alert(result.message);
      }
      };
      
  const handleToggleStatus = async (employee) => {
  const newStatus = employee.status === 'active' ? 'inactive' : 'active';

  try {
    const response = await fetch(`${BASE_URL}/employeesSide/update_employee_status.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employee.employee_id,
        status: newStatus
      })
    });

    const data = await response.json();
    if (data.success) {
      setEmployees(prev =>
        prev.map(emp =>
          emp.employee_id === employee.employee_id ? { ...emp, status: newStatus } : emp
        )
      );
      Swal.fire('Updated!', `Employee marked as ${newStatus}`, 'success');
    } else {
      Swal.fire('Error!', data.message || 'Status update failed.', 'error');
    }
  } catch (error) {
    console.error("Error updating status:", error);
    Swal.fire('Error!', 'Something went wrong.', 'error');
  }
};



  return (
    <div className="p-4 overflow-hidden">
      <div className='flex flex-row w-full'>
      <input
        type="text"
        placeholder="Search employees..."
        className="w-full max-w-md p-2 mx-1 mb-4 border rounded"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      
      <EmployeeModalButton onClick={() => setIsModalOpen(true)} />
      </div>

<EmployeeGridView
  loading={loading}
  filteredEmployees={filteredEmployees}
  selectedEmployees={selectedEmployees}
  handleSelectAll={handleSelectAll}
  handleSelectEmployee={handleSelectEmployee}
  handleEditEmployee={handleEditEmployee}
  handleDeleteEmployee={handleDeleteEmployee}
  handleToggleStatus={handleToggleStatus}
  user={user}
/>

<EmployeeModal
  isOpen={isModalOpen}
  onClose={() => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  }}
  onSubmit={handleAddEmployee}
  employee={selectedEmployee}
/>
      
    </div>
  );
};

export default EmployeeGridViewPage;    