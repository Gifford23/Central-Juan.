// import { useEffect, useState } from "react";
// import PropTypes from "prop-types";
// import { motion } from "framer-motion";
// import "../../../Styles/components/employee/EmployeeModal.css";
// import "../../../Styles/modal.css";
// import "../../../Styles/globals.css";
// import BASE_URL from '../../../backend/server/config';
// import TextField from '@mui/material/TextField';
// import DatePicker from "react-datepicker";
// import axios from "axios";
// import EmployeeTypeSelect from "./employeeComponents/EmployeeTypeSelect";
// import Swal from 'sweetalert2';

// const EmployeeModal = ({ isOpen, onClose, onSubmit, employee }) => {
//   const [newEmployee, setNewEmployee] = useState({
//     employee_id: "",
//     first_name: "",
//     middle_name: "",
//     last_name: "",
//     email: "",
//     contact_number: "",
//     date_of_birth: "",
//     department_id: "",
//     position_id: "",
//     base_salary: "",
//     employee_type: "Regular",
//   });

//   const [departments, setDepartments] = useState([]);
//   const [positions, setPositions] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [currentStep, setCurrentStep] = useState(1);
//   const [isAddingNew, setIsAddingNew] = useState(false);
//   const [newDepartment, setNewDepartment] = useState({ id: '', name: '' });
//   const [newPosition, setNewPosition] = useState({ id: '', name: '' });
//   const [selectedDeptIdForPosition, setSelectedDeptIdForPosition] = useState('');

//   const fetchDepartments = async () => {
//     try {
//       const res = await fetch(`${BASE_URL}/departments/department.php`);
//       const data = await res.json();
//       if (data.status === "success") {
//         setDepartments(data.data);
//       }
//     } catch (err) {
//       console.error('Failed to fetch departments:', err);
//     }
//   };

//   const fetchPositions = async (departmentId) => {
//     if (!departmentId) {
//       setPositions([]);
//       return;
//     }
//     try {
//       const response = await fetch(`${BASE_URL}/departments/positions/fetch_positions.php?department_id=${departmentId}`);
//       const data = await response.json();
//       if (Array.isArray(data)) {
//         setPositions(data);
//         console.log("Fetched Positions for Department:", data);
//       } else {
//         setPositions([]);
//       }
//     } catch (error) {
//       setPositions([]);
//       console.error('Error fetching positions:', error);
//     }
//   };

//   const handleAddDepartmentAndPosition = async () => {
//     try {
//       let departmentIdToUse = selectedDeptIdForPosition;

//       if (newDepartment.id && newDepartment.name) {
//         const deptRes = await fetch(`${BASE_URL}/departments/add_department.php`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             department_id: newDepartment.id,
//             department_name: newDepartment.name,
//           }),
//         });
//         const deptData = await deptRes.json();

//         if (deptData.status !== 'success') {
//           alert(deptData.message || 'Failed to add department');
//           return;
//         }
//         departmentIdToUse = newDepartment.id;
//       }

//       if (!departmentIdToUse) {
//         alert('Please select or add a department for the position.');
//         return;
//       }

//       const posRes = await fetch(`${BASE_URL}/departments/positions/add_positions.php`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           position_id: newPosition.id,
//           position_name: newPosition.name,
//           department_id: departmentIdToUse,
//         }),
//       });

//       const posData = await posRes.json();

//       if (posData.status === 'success') {
//         alert('Successfully added position!');
//         await fetchDepartments();
//         await fetchPositions(departmentIdToUse);
//         setNewEmployee((prev) => ({
//           ...prev,
//           department_id: departmentIdToUse,
//           position_id: newPosition.id,
//         }));
//         setNewDepartment({ id: '', name: '' });
//         setNewPosition({ id: '', name: '' });
//         setIsAddingNew(false);
//       } else {
//         alert(posData.message || 'Failed to add position');
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       alert('Something went wrong. Please try again.');
//     }
//   };

//   const resetForm = () => {
//     setNewEmployee({
//       employee_id: "",
//       first_name: "",
//       middle_name: "",
//       last_name: "",
//       email: "",
//       contact_number: "",
//       date_of_birth: "",
//       department_id: "",
//       position_id: "",
//       base_salary: "",
//       employee_type: "Regular",
//     });
//     setCurrentStep(1);
//   };

//   useEffect(() => {
//     if (!isOpen) {
//       resetForm();
//       return;
//     }

//     if (employee) {
//       setNewEmployee(employee);
//     } else {
//       fetchNewEmployeeId();
//     }
//   }, [employee, isOpen]);

//   const fetchNewEmployeeId = async () => {
//     try {
//       const response = await fetch(`${BASE_URL}/employeesSide/generate_employee_id.php`);
//       const data = await response.json();
//       if (data.employee_id) {
//         setNewEmployee((prev) => ({ ...prev, employee_id: data.employee_id }));
//       }
//     } catch (error) {
//       console.error("Error fetching new employee ID:", error);
//     }
//   };

//   useEffect(() => {
//     fetchDepartments();
//   }, []);

//   useEffect(() => {
//     fetchPositions(newEmployee.department_id);
//   }, [newEmployee.department_id]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setNewEmployee((prev) => ({ ...prev, [name]: value }));
//     if (name === "department_id") {
//       fetchPositions(value);
//     }
//   };

// const handleSubmit = async (e) => {
//   if (e?.preventDefault) e.preventDefault();

//   if (!newEmployee.first_name || !newEmployee.last_name) {
//     alert("Please fill in all required fields.");
//     return;
//   }

//   setLoading(true);

//   try {
//     if (employee && employee.employee_id) {
//       // ✅ Update flow
//       await onSubmit(newEmployee, "update");
//       Swal.fire({
//         icon: "success",
//         title: "Employee updated successfully!",
//         showConfirmButton: false,
//         timer: 2000,
//       });
//     } else {
//       // ✅ Add flow
//       const addResult = await onSubmit(newEmployee, "add"); // must return employee data

//       Swal.fire({
//         icon: "success",
//         title: "Employee added successfully!",
//         showConfirmButton: false,
//         timer: 2000,
//       });

//       // ✅ Make sure the backend returned employee data
//       if (addResult?.employee_id && addResult?.email && addResult?.password) {
//         await axios.post(`${BASE_URL}/employeesSide/send_employee_credentials.php`, {
//           email: addResult.email,
//           employee_id: addResult.employee_id,
//           password: addResult.password,
//         });
//       } else {
//         console.error("Employee data missing from addResult:", addResult);
//       }
//     }
//   } catch (err) {
//     console.error("Failed to add/update employee:", err);
//   }

//   setLoading(false);
//   resetForm();
// };


//   const handleNext = () => {
//     if (currentStep === 1) {
//       if (!newEmployee.first_name || !newEmployee.last_name) {
//         alert("Please fill in all required fields.");
//         return;
//       }
//       setCurrentStep(2);
//     } else {
//       handleSubmit();
//     }
//   };

//   const handleAddNew = () => {
//     setIsAddingNew(true);
//   };

//   const handleSelect = () => {
//     setIsAddingNew(false);
//   };

//   if (!isOpen) return null;


//   return (
// <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
//   <motion.div
//     className="w-full max-w-3xl p-6 bg-white shadow-xl rounded-2xl"
//     onClick={(e) => e.stopPropagation()}
//     initial={{ opacity: 0, scale: 0.9 }}
//     animate={{ opacity: 1, scale: 1 }}
//     exit={{ opacity: 0, scale: 0.9 }}
//   >
//     <h1 className="mb-6 text-2xl font-semibold text-gray-800">
//       {employee ? `Edit ${employee.first_name}'s Info` : "Add Employee"}
//     </h1>

//     <form onSubmit={handleSubmit} className="flex flex-col gap-6">
//       {currentStep === 1 && (
//         <>
//           {/* Step 1: Basic Info */}
//           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//             <div>
//               <label className="block mb-1 text-sm font-medium text-gray-700">
//                 Employee ID
//               </label>
//               <input
//                 type="text"
//                 name="employee_id"
//                 value={newEmployee.employee_id || "CJIS-"}
//                 readOnly
//                 className="w-full px-3 py-2 font-mono text-sm bg-gray-100 border rounded-lg"
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//             <TextField
//               required
//               label="First Name"
//               name="first_name"
//               value={newEmployee.first_name}
//               onChange={handleChange}
//               className="w-full"
//             />
//             <TextField
//               label="Middle Name"
//               name="middle_name"
//               value={newEmployee.middle_name}
//               onChange={handleChange}
//               className="w-full"
//             />
//           </div>

//           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//             <TextField
//               required
//               label="Last Name"
//               name="last_name"
//               value={newEmployee.last_name}
//               onChange={handleChange}
//               className="w-full"
//             />
//             <TextField
//               label="Email"
//               type="email"
//               name="email"
//               value={newEmployee.email}
//               onChange={handleChange}
//               className="w-full"
//             />
//           </div>

//           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//             <TextField
//               label="Contact Number"
//               name="contact_number"
//               value={newEmployee.contact_number}
//               onChange={handleChange}
//               className="w-full"
//             />
//             <TextField
//               label="Daily Base Salary"
//               type="number"
//               name="base_salary"
//               value={newEmployee.base_salary}
//               onChange={handleChange}
//               className="w-full"
//             />
//           </div>
//         </>
//       )}

//       {currentStep === 2 && (
//         <div className="flex flex-col gap-6">
// <div className="flex gap-4">
//   <button
//     type="button"
//     className={`flex-1 px-4 py-3 rounded-lg transition ${
//       !isAddingNew
//         ? "bg-green-600 text-white shadow-md"
//         : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//     }`}
//     onClick={() => {
//       setIsAddingNew(false);
//       fetchDepartments();
//     }}
//   >
//     Select Position & Department
//   </button>

//   <button
//     type="button"
//     className={`flex-1 px-4 py-3 rounded-lg transition ${
//       isAddingNew
//         ? "bg-green-600 text-white shadow-md"
//         : "bg-gray-200 text-gray-700 hover:bg-gray-300"
//     }`}
//     onClick={() => setIsAddingNew(true)}
//   >
//     Add New Position & Department
//   </button>
// </div>

//           {!isAddingNew ? (
// <div className="flex flex-col gap-4">
//   <div className="flex flex-col">
//     <label className="block mb-1 text-sm font-medium text-gray-700">
//       Department
//     </label>
//     <select
//       name="department_id"
//       value={newEmployee.department_id}
//       onChange={handleChange}
//       className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
//     >
//       <option value="">Select Department</option>
//       {departments.map((dept) => (
//         <option key={dept.department_id} value={dept.department_id}>
//           {dept.department_name}
//         </option>
//       ))}
//     </select>
//   </div>

//   <div className="flex flex-col">
//     <label className="block mb-1 text-sm font-medium text-gray-700">
//       Position
//     </label>
//     <select
//       name="position_id"
//       value={newEmployee.position_id}
//       onChange={handleChange}
//       className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
//     >
//       <option value="">Select Position</option>
//       {positions.map((pos) => (
//         <option key={pos.position_id} value={pos.position_id}>
//           {pos.position_name}
//         </option>
//       ))}
//     </select>
//   </div>

//   <div className="flex flex-col">
//     {/* <label className="block mb-1 text-sm font-medium text-gray-700">
//       Employee Type
//     </label> */}
//     <EmployeeTypeSelect
//       value={newEmployee.employee_type}
//       onChange={handleChange}
//     />
//   </div>
// </div>

//           ) : (
//             <div className="flex flex-col gap-4">
//               <h2 className="text-lg font-semibold text-gray-800">
//                 Add New Position & Department
//               </h2>

//               <div>
//                 <label className="block mb-1 text-sm font-medium text-gray-700">
//                   New Department (Optional)
//                 </label>
//                 <div className="flex gap-2">
//                   <input
//                     placeholder="Department ID"
//                     value={newDepartment.id}
//                     onChange={(e) =>
//                       setNewDepartment({ ...newDepartment, id: e.target.value })
//                     }
//                     className="flex-1 px-3 py-2 border rounded-lg"
//                   />
//                   <input
//                     placeholder="Department Name"
//                     value={newDepartment.name}
//                     onChange={(e) =>
//                       setNewDepartment({ ...newDepartment, name: e.target.value })
//                     }
//                     className="flex-1 px-3 py-2 border rounded-lg"
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label className="block mb-1 text-sm font-medium text-gray-700">
//                   Select Department for Position
//                 </label>
//                 <select
//                   value={selectedDeptIdForPosition}
//                   onChange={(e) => {
//                     setSelectedDeptIdForPosition(e.target.value);
//                     fetchPositions(e.target.value);
//                   }}
//                   className="w-full px-3 py-2 border rounded-lg"
//                 >
//                   <option value="">Select Existing Department</option>
//                   {departments.map((dept) => (
//                     <option key={dept.department_id} value={dept.department_id}>
//                       {dept.department_name}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div>
//                 <label className="block mb-1 text-sm font-medium text-gray-700">
//                   New Position
//                 </label>
//                 <div className="flex gap-2">
//                   <input
//                     placeholder="Position ID"
//                     value={newPosition.id}
//                     onChange={(e) =>
//                       setNewPosition({ ...newPosition, id: e.target.value })
//                     }
//                     className="flex-1 px-3 py-2 border rounded-lg"
//                   />
//                   <input
//                     placeholder="Position Name"
//                     value={newPosition.name}
//                     onChange={(e) =>
//                       setNewPosition({ ...newPosition, name: e.target.value })
//                     }
//                     className="flex-1 px-3 py-2 border rounded-lg"
//                   />
//                 </div>
//               </div>

//               <button
//                 type="button"
//                 onClick={handleAddDepartmentAndPosition}
//                 className="self-start px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
//               >
//                 Add
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Footer Buttons */}
//       <div className="flex justify-between mt-6">
//         {currentStep === 2 && (
//           <button
//             type="button"
//             onClick={() => setCurrentStep(1)}
//             className="px-4 py-2 text-sm text-white bg-gray-500 rounded-lg hover:bg-gray-600"
//           >
//             Back
//           </button>
//         )}
//         <div className="flex gap-3 ml-auto">
//           {currentStep === 1 && (
//             <button
//               type="button"
//               onClick={handleNext}
//               className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
//             >
//               Next
//             </button>
//           )}
//           {currentStep === 2 && (
//             <button
//               type="submit"
//               className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
//             >
//               Submit
//             </button>
//           )}
//           <button
//             type="button"
//             onClick={onClose}
//             className="px-5 py-2 text-sm text-white bg-gray-600 rounded-lg hover:bg-gray-700"
//           >
//             Cancel
//           </button>
//         </div>
//       </div>
//     </form>
//   </motion.div>
//    {/* 🔥 Loading Overlay (always rendered last inside return) */}
//     {loading && (
//       <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-opacity-50 z-[60]">
//         <div className="w-16 h-16 border-b-2 border-black rounded-full animate-spin"></div>
//       </div>
//     )}
// </div>

//   );
// };

// EmployeeModal.propTypes = {
//   isOpen: PropTypes.bool.isRequired,
//   onClose: PropTypes.func.isRequired,
//   onSubmit: PropTypes.func.isRequired,
//   employee: PropTypes.object,
// };

// export default EmployeeModal;