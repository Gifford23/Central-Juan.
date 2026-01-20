// hooks/employeeAndDepHooks/useEmployeeAndDep.js
import { useState } from 'react';
import Swal from 'sweetalert2';
import {
  fetchDepartmentsAPI,
  fetchPositionsAPI,
  addDepartmentAPI,
  addPositionAPI,
} from '../employeeAPI/EmployeeAndDepAPI';

export const useEmployeeAndDep = () => {
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const fetchDepartments = async () => {
    try {
      const data = await fetchDepartmentsAPI();
      if (data.status === 'success') {
        setDepartments(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchPositions = async (departmentId) => {
    try {
      const data = await fetchPositionsAPI(departmentId);
      if (Array.isArray(data)) {
        setPositions(data);
      } else {
        setPositions([]);
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
      setPositions([]);
    }
  };

  // ✅ New: SweetAlert-based department addition
  const handleAddDepartment = async (newDepartment) => {
    try {
      //Server request
      if (!newDepartment?.name) {
        Swal.fire({
          icon: 'warning',
          title: 'Oops!',
          text: 'Department name is required.',
        });
        return;
      }

      //payload
      const deptData = await addDepartmentAPI({
        department_id: newDepartment.id,
        department_name: newDepartment.name,
      });

      console.log('Response from server:', deptData); // Debug

      if (deptData.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Department record successfully saved.',
        }).then(() => {
          fetchDepartments();
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Oops!',
          text: deptData.message || 'Failed to save department record.',
        });
      }
    } catch (err) {
      console.error('Error saving department:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Error saving department. Please try again later.',
      });
    }
  };


  // ✅ Combined add department + position
  const handleAddDepartmentAndPosition = async ({
    newDepartment,
    newPosition,
    selectedDeptIdForPosition,
    setNewEmployee,
    resetFormStates,
  }) => {
    try {
      let departmentIdToUse = selectedDeptIdForPosition;

      // Add Department if provided
      if (newDepartment?.id && newDepartment?.name) {
        const deptData = await addDepartmentAPI({
          department_id: newDepartment.id,
          department_name: newDepartment.name,
        });

        if (deptData.status !== 'success') {
          alert(deptData.message || 'Failed to add department');
          return;
        }
        departmentIdToUse = newDepartment.id;
        await fetchDepartments(); // refresh after adding
      }

      if (!departmentIdToUse) {
        alert('Please select or add a department for the position.');
        return;
      }

      // Add Position
      const posData = await addPositionAPI({
        position_id: newPosition.id,
        position_name: newPosition.name,
        department_id: departmentIdToUse,
      });

      if (posData.status === 'success') {
        alert('Successfully added position!');
        await fetchPositions(departmentIdToUse);

        setNewEmployee((prev) => ({
          ...prev,
          department_id: departmentIdToUse,
          position_id: newPosition.id,
        }));

        resetFormStates();
      } else {
        alert(posData.message || 'Failed to add position');
      }
    } catch (err) {
      console.error('Error adding department/position:', err);
      alert('Something went wrong. Please try again.');
    }
  };

  // ✅ Add new position only (no department)
const handleAddPosition = async ({
  newPosition,
  selectedDeptIdForPosition,
  setNewEmployee,
  resetFormStates,
}) => {
  try {
    if (!selectedDeptIdForPosition) {
      Swal.fire("Error", "Please select a department for the position.", "error");
      return;
    }

    if (!newPosition?.id || !newPosition?.name) {
      Swal.fire("Error", "Position name is required.", "error");
      return;
    }

    const posData = await addPositionAPI({
      position_id: newPosition.id,
      position_name: newPosition.name,
      department_id: selectedDeptIdForPosition,
    });

    if (posData.status === "success") {
      Swal.fire("Success", "Position successfully added!", "success");
      await fetchPositions(selectedDeptIdForPosition);

      // ✅ Update the employee form with new dept & pos
      if (setNewEmployee) {
        setNewEmployee((prev) => ({
          ...prev,
          department_id: selectedDeptIdForPosition,
          position_id: newPosition.id,
        }));
      }

      if (resetFormStates) resetFormStates();
    } else {
      Swal.fire("Error", posData.message || "Failed to add position", "error");
    }
  } catch (err) {
    console.error("Error adding position:", err);
    Swal.fire("Error", "Something went wrong while adding position.", "error");
  }
};


  const generateNextDepartmentId = () => {
    const prefix = "DEP-";
    const idNumbers = departments
      .map((d) => parseInt(d.department_id.replace(prefix, "")))
      .filter((num) => !isNaN(num))
      .sort((a, b) => a - b);

    const nextIdNumber = idNumbers.length > 0 ? Math.max(...idNumbers) + 1 : 1;
    return `${prefix}${String(nextIdNumber).padStart(3, "0")}`;
  };

const generateNextPositionId = (departmentId) => {
  if (!departmentId) return "";

  const deptPrefix = departmentId; // e.g., DEP-001
  const posNumbers = positions
    .filter((p) => p.position_id.startsWith(`${deptPrefix}-P`))
    .map((p) =>
      parseInt(p.position_id.replace(`${deptPrefix}-P`, ""))
    )
    .filter((num) => !isNaN(num))
    .sort((a, b) => a - b);

  const nextPosNum = posNumbers.length > 0 ? Math.max(...posNumbers) + 1 : 1;
  return `${deptPrefix}-P${nextPosNum}`;
};


  return {
    departments,
    positions,
    fetchDepartments,
    fetchPositions,
    handleAddDepartment,
    handleAddDepartmentAndPosition,
    generateNextDepartmentId,
    generateNextPositionId,
    handleAddPosition,
  };
};
