import { useState, useEffect } from "react";
import "../../../Styles/components/attendance/AttendanceModal.css"; // Import the CSS file for styling
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import BASE_URL from '../../../backend/server/config'; 

const AttendanceModal = ({ data, onClose, refreshData }) => {
  const [formData, setFormData] = useState({
    attendance_id: "",
    employee_id: "",
    attendance_date: "",
    employee_name: "",
    time_in_morning: "",
    time_out_morning: "",
    time_in_afternoon: "",
    time_out_afternoon: "",
  });

  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    // Fetch employees when the modal is opened
    const fetchEmployees = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/employeesSide/employees.php`
        );
        const data = await response.json();
        console.log("Fetched employees:", data); // Log fetched employees
        setEmployees(data);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    fetchEmployees();

    if (data) {
      setFormData(data);
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Fetch employee name when employee_id changes
    if (name === "employee_id") {
      const selectedEmployee = employees.find(
        (emp) => emp.employee_id === value
      );
      if (selectedEmployee) {
        setFormData((prev) => ({
          ...prev,
          employee_name: `${selectedEmployee.first_name} ${
            selectedEmployee.middle_name || ""
          } ${selectedEmployee.last_name}`,
        }));
        console.log("Selected employee:", selectedEmployee); // Log selected employee
      } else {
        setFormData((prev) => ({ ...prev, employee_name: "" }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
        const method = data ? "PUT" : "POST";
        const url = data
            ? `${BASE_URL}/attendance/update_attendance.php?id=${formData.attendance_id}`
            : `${BASE_URL}/attendance/create_attendance.php`;

        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            const errorText = await response.text(); 
            console.error("Server error:", errorText); 
            throw new Error("Network response was not ok");
        }

        const resData = await response.json();
        console.log("Response data:", resData); 

        if (resData.success) {
            Swal.fire({
                icon: "success",
                title: "Success!",
                text: "Attendance record saved successfully.",
                confirmButtonColor: "#3085d6",
            });


            // ✅ FIX: Ensure refreshData exists before calling it
            if (typeof refreshData === "function") {
                refreshData();
            } else {
                console.warn("refreshData is not defined.");
            }
        } else {
            Swal.fire({
                icon: "error",
                title: "Oops!",
                text: resData.message || "Failed to save the record.",
                confirmButtonColor: "#d33",
            });
        }
    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Error saving record: " + error.message,
            confirmButtonColor: "#d33",
        });
    }
};


const handleDelete = async () => {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!"
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const response = await fetch(
          `${BASE_URL}/attendance/delete_attendance.php?id=${formData.attendance_id}`,
          {
            method: "DELETE",
          }
        );
        const resData = await response.json();
        console.log("Delete response data:", resData); // Log the response data for debugging

        if (resData.success) {
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Attendance record deleted successfully.",
          });

          if (typeof refreshData === "function") {
            refreshData(); // Ensure it exists before calling
          } else {
            console.error("refreshData is not a function");
          }

          
        } else {
          Swal.fire({
            icon: "error",
            title: "Oops!",
            text: resData.message || "Failed to delete the record.",
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Error deleting record: " + error.message,
        });
      }
    }
  });
};


const modalVariants = {
  hidden: { opacity: 0, y: 50 }, // Start slightly lower and invisible
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }, // Fade in and slide up
  exit: { opacity: 0, y: 50, transition: { duration: 0.2, ease: "easeIn" } }, // Fade out and slide down
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};


  return (
    <motion.div
    className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 modal-overlay"
    variants={overlayVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
  >
    <motion.div
      className="w-11/12 max-w-md p-6 bg-white rounded-lg shadow-lg modal-content"
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <h2 className="mb-4 text-2xl font-semibold">{data ? "Edit" : "Add"} Attendance</h2>
      <form onSubmit={handleSubmit} className="space-y-4 attendance-form">
        <div className="employee_detail">
          <div className="form-group">
            <label className="text-lg font-medium">Date:</label>
            <input
              type="date"
              name="attendance_date"
              value={formData.attendance_date}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="form-group">
            <label className="text-lg font-medium">Employee:</label>
            <select
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.middle_name || ""} {emp.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="text-lg font-medium">Employee Name:</label>
            <input
              type="text"
              name="employee_name"
              value={formData.employee_name}
              readOnly
              className="w-full p-2 bg-gray-100 border rounded"
            />
          </div>
        </div>

        <div className="space-y-4 time_inout">
          {/* Morning Time In-Out */}
          <p className="text-xl font-medium text-gray-700">Morning</p>
          <div className="flex space-x-4 morning_inout">
            <div className="form-group">
              <label className="text-lg font-medium">Time In:</label>
              <input
                type="time"
                name="time_in_morning"
                value={formData.time_in_morning}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="form-group">
              <label className="text-lg font-medium">Time Out:</label>
              <input
                type="time"
                name="time_out_morning"
                value={formData.time_out_morning}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Afternoon Time In-Out */}
          <p className="text-xl font-medium text-gray-700">Afternoon</p>
          <div className="flex space-x-4 afternoon_inout">
            <div className="form-group">
              <label className="text-lg font-medium">Time In:</label>
              <input
                type="time"
                name="time_in_afternoon"
                value={formData.time_in_afternoon}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="form-group">
              <label className="text-lg font-medium">Time Out:</label>
              <input
                type="time"
                name="time_out_afternoon"
                value={formData.time_out_afternoon}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4 space-x-4 form-actions">
          <button
            type="button"
            className="px-4 py-2 text-white bg-gray-500 rounded cancel-btn hover:bg-gray-600"
            onClick={onClose}
          >
            Cancel
          </button>
          {data && (
            <button
              type="button"
              className="px-4 py-2 text-white bg-red-500 rounded delete-btn hover:bg-red-600"
              onClick={handleDelete}
            >
              Delete these records
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 rounded save-btn hover:bg-blue-700"
          >
            {data ? "Apply changes" : "Save new attendance"}
          </button>
        </div>
        
      </form>
      
    </motion.div>
  </motion.div>
  );
};

export default AttendanceModal;