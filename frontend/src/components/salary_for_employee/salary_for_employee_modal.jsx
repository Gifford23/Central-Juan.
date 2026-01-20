import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import BASE_URL from '../../../backend/server/config'; 

const SalaryGradeModal = ({ isVisible, onClose, fetchSalaries, isEditing, initialFormData }) => {
  const [salaryGrades, setSalaryGrades] = useState([]);
  const [selectedPositionLevel, setSelectedPositionLevel] = useState('');
  const [salarySteps, setSalarySteps] = useState({ Step1: '', Step2: '', Step3: '' });
  const [selectedStep, setSelectedStep] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const modalRef = useRef(null);

  useEffect(() => {
    const fetchSalaryGrades = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/salaryGrades/salary_grades.php`);
        if (response.data.success && Array.isArray(response.data.data)) {
          setSalaryGrades(response.data.data);
        } else {
          console.error('Fetched data is not an array:', response.data);
        }
      } catch (error) {
        console.error('Error fetching salary grades:', error);
      }
    };
  
    fetchSalaryGrades();
  }, []);

  useEffect(() => {
    if (isEditing && initialFormData) {
      setSelectedPositionLevel(initialFormData.position_level);
      setSelectedStep(initialFormData.step);
      const selectedGrade = salaryGrades.find(grade => grade.PositionLevel === initialFormData.position_level);
      if (selectedGrade) {
        setSalarySteps({
          Step1: selectedGrade.Step1,
          Step2: selectedGrade.Step2,
          Step3: selectedGrade.Step3,
        });
      }
    }
  }, [isEditing, initialFormData, salaryGrades]);

  const handlePositionLevelChange = (event) => {
    const positionLevel = event.target.value;
    setSelectedPositionLevel(positionLevel);
  
    const selectedGrade = salaryGrades.find(grade => grade.GradeID === positionLevel);
    if (selectedGrade) {
      setSalarySteps({
        Step1: selectedGrade.Step1,
        Step2: selectedGrade.Step2,
        Step3: selectedGrade.Step3,
      });
      setSelectedStep(selectedGrade.Step1);
    } else {
      setSalarySteps({ Step1: '', Step2: '', Step3: '' });
      setSelectedStep('');
    }
  };

  const handleStepChange = (event) => {
    const selectedSalary = event.target.value;
    setSelectedStep(selectedSalary);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const updatedFormData = {
      salary_id: initialFormData.salary_id,
      employee_id: initialFormData.employee_id,
      employee_name: initialFormData.employee_name,
      department_name: initialFormData.department_name,
      position_name: initialFormData.position_name,
      position_level: selectedPositionLevel,
      step: getStepFromSalary(selectedStep),
    };
  
    console.log("Updating with:", updatedFormData);
  
    try {
      let response;
      if (isEditing) {
        response = await axios.put(`${BASE_URL}/salary_for_employee/edit_salary_for_employee.php`, updatedFormData);
      } else {
        response = await axios.post(`${BASE_URL}/salary_for_employee/add_salary_for_employee.php`, updatedFormData);
      }
    
      if (response.data.success) {
        Swal.fire({
          title: "Success!",
          text: response.data.message || "Salary record updated successfully.",
          icon: "success",
          confirmButtonText: "OK",
        }).then(() => {
          fetchSalaries();
          onClose();
        });
      } else {
        Swal.fire({
          title: "Error!",
          text: response.data.message || "Failed to save salary record.",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Error saving salary:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to save salary record. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
    
  };
  
  const getStepFromSalary = (salary) => {
    if (salary === salarySteps.Step1) {
      return '1';
    } else if (salary === salarySteps.Step2) {
      return '2';
    } else if (salary === salarySteps.Step3) {
      return '3';
    }
    return '';
  };

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden'; // Prevent scrolling
      modalRef.current.focus(); // Focus on the modal when it opens
    } else {
      document.body.style.overflow = 'unset'; // Restore scrolling
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="modal-overlay fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1} // Make the modal focusable
            className="bg-white rounded-lg flex flex-col shadow-lg p-6 z-10 w-11/12 max-w-md"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <h3 className="text-lg font-semibold mb-4">
            {isEditing ? "Edit Salary for " + initialFormData.employee_name : "Add Salary"}
            </h3>
            <form className='flex flex-col' onSubmit={handleSubmit}>
              <input type="hidden" name="salary_id" value={initialFormData.salary_id} />
              <input
                type="text"
                name="employee_id"
                placeholder="Employee ID"
                value={initialFormData.employee_id}
                onChange={(e) => setFormData({ ...initialFormData, employee_id: e.target.value })}
                required
                className={`font-mono border border-gray-300 rounded p-2 mb-2 w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditing ? "bg-gray-200 cursor-not-allowed" : ""}`}
                disabled={!!isEditing}
              />
              <input
                type="text"
                name="employee_name"
                placeholder="Employee Name"
                value={initialFormData.employee_name}
                onChange={(e) => setFormData({ ...initialFormData, employee_name: e.target.value })}
                required
                className={`font-mono border border-gray-300 rounded p-2 mb-2 w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditing ? "bg-gray-200 cursor-not-allowed" : ""}`}
                disabled={!!isEditing}
              />
              <input
                type="text"
                name="department_name"
                placeholder="Department Name"
                value={initialFormData.department_name}
                onChange={(e) => setFormData({ ...initialFormData, department_name: e.target.value })}
                required
                className={`font-mono border border-gray-300 rounded p-2 mb-2 w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditing ? "bg-gray-200 cursor-not-allowed" : ""}`}
                disabled={!!isEditing}
              />
              {/* <input
                type="text"
                name="position_name"
                placeholder="Position Name"
                value={initialFormData.position_name}
                onChange={(e) => setFormData({ ...initialFormData, position_name: e.target.value })}
                required
                className={`border border-gray-300 rounded p-2 mb-2 w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditing ? "bg-gray-200 cursor-not-allowed" : ""}`}
                disabled={!!isEditing}
              /> */}

              <select
                onChange={handlePositionLevelChange}
                value={selectedPositionLevel}
                className="font-mono border border-gray-300 rounded p-2 mb-2 w-full"
              >
                <option value="">Select Position Level</option>
                {salaryGrades.map((grade) => (
                  <option key={grade.GradeID} value={grade.GradeID}>
                    {grade.PositionLevel}
                  </option>
                ))}
              </select>

              <select
                onChange={handleStepChange}
                value={selectedStep}
                className="font-mono border border-gray-300 rounded p-2 mb-2 w-full"
              >
                <option value="">Select Step</option>
                {salarySteps.Step1 && <option value={salarySteps.Step1}>Step 1 - {salarySteps.Step1} </option>}
                {salarySteps.Step2 && <option value={salarySteps.Step2}>Step 2 - {salarySteps.Step2} </option>}
                {salarySteps.Step3 && <option value={salarySteps.Step3}>Step 3 - {salarySteps.Step3} </option>}
              </select>
              
              <div className='flex w-full justify-end gap-4 flex-row'>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {isEditing ? "Update Salary" : "Add Salary"}
                </button>

                <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                  Cancel
                </button>
              </div>

            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

SalaryGradeModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fetchSalaries: PropTypes.func.isRequired,
  isEditing: PropTypes.bool.isRequired,
  initialFormData: PropTypes.object.isRequired,
};

export default SalaryGradeModal;