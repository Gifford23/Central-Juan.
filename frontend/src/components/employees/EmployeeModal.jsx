// EmployeeModal.jsx
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import "../../../Styles/components/employee/EmployeeModal.css";
import "../../../Styles/modal.css";
import "../../../Styles/globals.css";
import BASE_URL from '../../../backend/server/config';
import TextField from '@mui/material/TextField';
import axios from "axios";
import EmployeeTypeSelect from "./employeeComponents/EmployeeTypeSelect";
import Swal from 'sweetalert2';
import { useEmployeeAndDep } from "./empAndDepHooks/useEmployeeAndDep";
import DepartmentModal from "../departments/DepartmentModal";
 
const EmployeeModal = ({ isOpen, onClose, onSubmit, employee, onOpenAssign }) => {
  const {
    departments,
    positions,
    fetchDepartments,
    fetchPositions,
    handleAddDepartmentAndPosition,
    handleAddDepartment,
    generateNextPositionId,
    generateNextDepartmentId,
    handleAddPosition,
  } = useEmployeeAndDep();

  const [newEmployee, setNewEmployee] = useState({
    employee_id: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    date_of_birth: "",
    department_id: "",
    position_id: "",
    base_salary: "",
    monthly_rate: "",
    hourly_rate: "",
    salary_type: "daily",
    employee_type: "Regular",
    branch_id: "",
    branch_name: "",
    custom_user_id: "" // <-- kept
  });

  const [branches, setBranches] = useState([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ id: "", name: "" });
  const [newPosition, setNewPosition] = useState({ id: "", name: "" });
  const [selectedDeptIdForPosition, setSelectedDeptIdForPosition] = useState("");
  const [openAssignAfterSave, setOpenAssignAfterSave] = useState(false);

  // salary UI state
  const [salaryType, setSalaryType] = useState("daily");
  const [displaySalary, setDisplaySalary] = useState("");

  // credentials modal state / info
  const [credentials, setCredentials] = useState(null);
  const [showCredModal, setShowCredModal] = useState(false);

  const resetForm = () => {
    setNewEmployee({
      employee_id: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
      contact_number: "",
      date_of_birth: "",
      department_id: "",
      position_id: "",
      monthly_rate: "",
      hourly_rate: "",
      base_salary: "",
      employee_type: "Regular",
      branch_id: "",
      branch_name: "",
      custom_user_id: ""
    });
    setDisplaySalary("");
    setSalaryType("daily");
    setCurrentStep(1);
  };
 
  useEffect(() => {
    if (!isOpen) return;

    if (employee) {
      setNewEmployee(prev => ({ ...prev, ...employee }));
      const initialSalaryType =
        employee && (employee.salary_type === "monthly" || employee.salary_type === "daily")
          ? employee.salary_type
          : "daily";
      setSalaryType(initialSalaryType);

      if (initialSalaryType === "monthly") {
        const m =
          employee.monthly_rate != null && employee.monthly_rate !== ""
            ? employee.monthly_rate
            : employee.base_salary
            ? Number(employee.base_salary) * 26
            : "";
        setDisplaySalary(m !== undefined && m !== null ? String(m) : "");
      } else {
        setDisplaySalary(
          employee.base_salary != null && employee.base_salary !== "" ? String(employee.base_salary) : ""
        );
      }
    } else {
      fetchNewEmployeeId();
      setDisplaySalary("");
      setNewEmployee(prev => ({ ...prev, monthly_rate: "", hourly_rate: "", base_salary: "", custom_user_id: "" }));
      setSalaryType("daily");
    }

    fetchBranches();
  }, [employee, isOpen]);

  const fetchNewEmployeeId = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employeesSide/generate_employee_id.php`);
      const data = await response.json();
      if (data.employee_id) {
        setNewEmployee((prev) => ({ ...prev, employee_id: data.employee_id }));
      }
    } catch (err) {
      console.error("Error fetching new employee ID:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/branches/get_branch.php`);
      if (res.data && res.data.success) {
        setBranches(res.data.data || []);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.error("Failed to fetch branches:", err);
      setBranches([]);
    }
  };

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (departments.length >= 0) {
      setNewDepartment((prev) => ({
        ...prev,
        id: generateNextDepartmentId(),
      }));
    }
  }, [departments]);

  useEffect(() => {
    if (selectedDeptIdForPosition) {
      const nextPosId = generateNextPositionId(selectedDeptIdForPosition, positions);
      setNewPosition((prev) => ({
        ...prev,
        id: nextPosId,
      }));
    }
  }, [selectedDeptIdForPosition, positions]);

  useEffect(() => {
    if (newEmployee.department_id) fetchPositions(newEmployee.department_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newEmployee.department_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "branch_id") {
      const sel = branches.find((b) => String(b.branch_id) === String(value));
      setNewEmployee((prev) => ({
        ...prev,
        branch_id: value,
        branch_name: sel ? (sel.name ?? sel.branch_name ?? "") : ""
      }));
      return;
    }

    setNewEmployee((prev) => ({ ...prev, [name]: value }));

    if (name === "department_id") fetchPositions(value);
  };

  const handleSalaryTypeToggle = (type) => {
    if (type === salaryType) return;

    if (type === "monthly") {
      const monthly = (newEmployee.monthly_rate != null && newEmployee.monthly_rate !== "")
        ? Number(newEmployee.monthly_rate)
        : (newEmployee.base_salary ? Number(newEmployee.base_salary) * 26 : "");
      setDisplaySalary(monthly !== undefined && !Number.isNaN(monthly) ? String(monthly) : "");
    } else {
      const daily = (newEmployee.base_salary != null && newEmployee.base_salary !== "")
        ? Number(newEmployee.base_salary)
        : "";
      setDisplaySalary(daily !== undefined && daily !== null ? String(daily) : "");
    }

    setSalaryType(type);
  };

  const parseNumber = (str) => {
    if (typeof str !== "string" && typeof str !== "number") return NaN;
    const cleaned = String(str).replace(/,/g, "").trim();
    if (cleaned === "") return NaN;
    return Number(cleaned);
  };

  const handleSalaryInputChange = (e) => {
    const raw = e.target.value;
    setDisplaySalary(raw);

    const num = parseNumber(raw);
    if (Number.isNaN(num)) {
      setNewEmployee(prev => ({
        ...prev,
        base_salary: "",
        monthly_rate: "",
        hourly_rate: ""
      }));
      return;
    }

    let daily = 0;
    let monthly = 0;
    if (salaryType === "monthly") {
      monthly = num;
      daily = monthly / 26;
    } else {
      daily = num;
      monthly = daily * 26;
    }
    const hourly = daily / 8;

    setNewEmployee(prev => ({
      ...prev,
      base_salary: +daily.toFixed(6),
      monthly_rate: +monthly.toFixed(2),
      hourly_rate: +hourly.toFixed(6)
    }));
  };

  const buildPayloadForSubmit = (employeeData) => {
    const payload = { ...employeeData };

    // include custom_user_id only if present and numeric
    if (employeeData.custom_user_id !== undefined && employeeData.custom_user_id !== null && String(employeeData.custom_user_id).trim() !== "") {
      const v = String(employeeData.custom_user_id).trim();
      if (/^\d+$/.test(v)) {
        payload.custom_user_id = parseInt(v, 10);
      } else {
        delete payload.custom_user_id;
      }
    } else {
      delete payload.custom_user_id;
    }

    const num = parseNumber(displaySalary);

    if (!Number.isNaN(num)) {
      if (salaryType === "monthly") {
        payload.monthly_rate = +num.toFixed(2);
        payload.base_salary = "";
        const computedDaily = num / 26;
        payload.hourly_rate = +((computedDaily / 8).toFixed(6));
      } else {
        payload.base_salary = +num;
        payload.monthly_rate = +((num * 26).toFixed(2));
        payload.hourly_rate = +((num / 8).toFixed(6));
      }
    } else {
      delete payload.base_salary;
      delete payload.monthly_rate;
      delete payload.hourly_rate;
    }
    payload.salary_type = salaryType;

    return payload;
  };

  const sendCredentialsEmail = async ({ email, employee_id, password }) => {
    if (!email) return;
    try {
      await axios.post(`${BASE_URL}/employeesSide/send_employee_credentials.php`, {
        email,
        employee_id,
        password,
      });
    } catch (err) {
      console.error("Failed to send credentials email:", err);
    }
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!newEmployee.first_name || !newEmployee.last_name) {
      Swal.fire("Error", "Please fill in all required fields.", "error");
      return;
    }

    setLoading(true);

    try {
      const payload = buildPayloadForSubmit(newEmployee);

      if (employee?.employee_id) {
        // Update employee
        const res = await onSubmit(payload, "update"); // expects API JSON

        // re-fetch if caller has provided fetchEmployees
        if (typeof fetchEmployees === "function") await fetchEmployees();

        // handle user created (new users)
        if (res && res.user_created && res.password) {
          const cred = {
            username: res.username,
            password: res.password,
            email: res.email,
            employee_id: res.employee_id,
            user_id: res.user_id
          };
          setCredentials(cred);
          setShowCredModal(true);
          await sendCredentialsEmail({ email: cred.email, employee_id: cred.employee_id, password: cred.password });
        }

        // handle user_id updated for existing user
        if (res && res.user_id_updated) {
          const oldId = res.user_id_old;
          const newId = res.user_id_new;
          Swal.fire("Success", `User ID updated: ${oldId} → ${newId}`, "success");
          // show info modal for new id (so user can copy or note it)
          setCredentials({
            username: res.username ?? employee.employee_id,
            password: null,
            email: res.email ?? newEmployee.email,
            user_id_old: oldId,
            user_id_new: newId,
          });
          setShowCredModal(true);
        }

        if (res && res.warnings && res.warnings.length) {
          Swal.fire("Warning", Array.isArray(res.warnings) ? res.warnings.join("\n") : String(res.warnings), "warning");
        }

      } else {
        // Add employee
        const addResult = await onSubmit(payload, "add");

        if (typeof fetchEmployees === "function") await fetchEmployees();

        if (addResult?.employee_id && addResult?.password) {
          const cred = {
            username: addResult.username ?? addResult.employee_id,
            password: addResult.password,
            email: addResult.email ?? newEmployee.email,
            employee_id: addResult.employee_id,
            user_id: addResult.user_id ?? null
          };
          setCredentials(cred);
          setShowCredModal(true);
          await sendCredentialsEmail({ email: cred.email, employee_id: cred.employee_id, password: cred.password });
        } else if (addResult?.employee_id && addResult?.email && addResult?.password) {
          await axios.post(`${BASE_URL}/employeesSide/send_employee_credentials.php`, {
            email: addResult.email,
            employee_id: addResult.employee_id,
            password: addResult.password,
          }).catch((err) => console.error("send email error", err));
        }

        if (openAssignAfterSave && addResult?.employee_id) {
          onClose?.();
          setTimeout(() => onOpenAssign?.([addResult.employee_id]), 120);
          setLoading(false);
          resetForm();
          return;
        }
      }
    } catch (err) {
      console.error("Failed to add/update employee:", err);
      Swal.fire("Error", "Failed to save employee. See console.", "error");
    }

    setLoading(false);
    resetForm();
    onClose?.();
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!newEmployee.first_name || !newEmployee.last_name) {
        Swal.fire("Error", "Please fill in all required fields.", "error");
        return;
      }
      setCurrentStep(2);
    } else {
      handleSubmit();
    }
  };

  const copyToClipboard = (text) => {
    try {
      navigator.clipboard.writeText(text);
      Swal.fire("Copied", "Copied to clipboard", "success");
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <motion.div
          className="w-full max-w-3xl p-6 bg-white shadow-xl rounded-2xl"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <h1 className="mb-6 text-2xl font-semibold text-gray-800">
            {employee ? `Edit ${employee.first_name}'s Info` : "Add Employee"}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {currentStep === 1 && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      name="employee_id"
                      value={newEmployee.employee_id || "CJIS-"}
                      readOnly
                      className="w-full px-3 py-2 font-mono text-sm bg-gray-100 border rounded-lg"
                    />
                  </div>

                  {/* Biometrics / custom_user_id: only show when editing an existing employee */}
                  {employee && (
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Biometrics ID (optional)
                      </label>
                      <input
                        type="text"
                        name="custom_user_id"
                        placeholder="e.g. 105"
                        value={newEmployee.custom_user_id ?? ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2 font-mono text-sm bg-white border rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">If provided, system will try to use this user_id for the account. If taken, next available id will be used.</p>
                    </div>
                  )}
                </div>


                {/* rest of form kept unchanged (first name, last name, etc.) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField
                    required
                    label="First Name"
                    name="first_name"
                    value={newEmployee.first_name}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <TextField
                    label="Middle Name"
                    name="middle_name"
                    value={newEmployee.middle_name}
                    onChange={handleChange}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField
                    required
                    label="Last Name"
                    name="last_name"
                    value={newEmployee.last_name}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <TextField
                    label="Email"
                    type="email"
                    name="email"
                    value={newEmployee.email}
                    onChange={handleChange}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField
                    label="Contact Number"
                    name="contact_number"
                    value={newEmployee.contact_number || ""}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <TextField
                    label="Date of Birth"
                    type="date"
                    name="date_of_birth"
                    value={newEmployee.date_of_birth || ""}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col">
                    <div className="relative">
                      <TextField
                        fullWidth
                        label="Base Salary"
                        type="text"
                        name="base_salary"
                        value={displaySalary}
                        onChange={handleSalaryInputChange}
                        className="w-full pr-28"
                      />
                      <div className="absolute top-1/2 right-2 -translate-y-1/2 flex border rounded-md overflow-hidden shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleSalaryTypeToggle("daily")}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors ${salaryType === "daily" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSalaryTypeToggle("monthly")}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors ${salaryType === "monthly" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                          Monthly
                        </button>
                      </div>
                    </div>
                    {(() => {
                      const rawDaily = parseFloat(newEmployee.base_salary);
                      const ok = !Number.isNaN(rawDaily) && isFinite(rawDaily);
                      let daily = NaN, monthly = NaN, hourly = NaN;
                      if (ok) {
                        daily = rawDaily;
                        monthly = daily * 26;
                        hourly = daily / 8;
                      }
                      return (
                        <div className="mt-2 text-[15px] text-gray-700 font-sans leading-relaxed">
                          {ok ? (
                            salaryType === "daily" ? (
                              <>
                                <div>₱ {daily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × 26 = <span className="font-medium">₱ {monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> monthly rate</div>
                                <div>₱ {daily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ 8 = <span className="font-medium">₱ {hourly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> hourly rate</div>
                              </>
                            ) : (
                              <>
                                <div>₱ {monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ 26 = <span className="font-medium">₱ {daily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> daily rate</div>
                                <div>₱ {daily.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ÷ 8 = <span className="font-medium">₱ {hourly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> hourly rate</div>
                              </>
                            )
                          ) : (
                            <div className="text-gray-500 italic">Enter a salary to compute...</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div />
                </div>
              </>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col gap-6">
                <div className="flex gap-4">
                  <button type="button" className={`flex-1 px-4 py-3 rounded-lg transition ${!isAddingNew ? "bg-green-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`} onClick={() => { setIsAddingNew(false); fetchDepartments(); }}>
                    Select Position & Department
                  </button>
                  <button type="button" className={`flex-1 px-4 py-3 rounded-lg transition ${isAddingNew ? "bg-green-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`} onClick={() => setIsAddingNew(true)}>
                    Add New Position & Department
                  </button>
                </div>

                {!isAddingNew ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      <label className="block mb-1 text-sm font-medium text-gray-700">Department</label>
                      <select name="department_id" value={newEmployee.department_id} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="">Select Department</option>
                        {departments.map((dept) => (<option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="block mb-1 text-sm font-medium text-gray-700">Position</label>
                      <select name="position_id" value={newEmployee.position_id} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="">Select Position</option>
                        {positions.map((pos) => (<option key={pos.position_id} value={pos.position_id}>{pos.position_name}</option>))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <EmployeeTypeSelect value={newEmployee.employee_type} onChange={handleChange} />
                    </div>

                    <div className="flex flex-col">
                      <label className="block mb-1 text-sm font-medium text-gray-700">Assign to branch (optional)</label>
                      <select name="branch_id" value={newEmployee.branch_id ?? ""} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="">Select Branch</option>
                        {branches.map((b) => (<option key={b.branch_id} value={b.branch_id}>{b.name}</option>))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-gray-800">Add New Position & Department</h2>
                    <div className="flex flex-col gap-2">
                      <label className="block mb-1 text-sm font-medium text-gray-700">New Department (Optional)</label>
                      <div className="flex items-center gap-2">
                        <input placeholder="Department ID" value={newDepartment.id} readOnly onChange={(e) => setNewDepartment({ ...newDepartment, id: e.target.value })} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200" />
                        <input placeholder="Department Name" value={newDepartment.name} onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200" />
                        <button type="button" onClick={() => handleAddDepartment(newDepartment)} className="px-3 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Add Dept</button>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">Select Department for Position</label>
                      <select value={selectedDeptIdForPosition} onChange={(e) => { const selected = e.target.value; setSelectedDeptIdForPosition(selected); if (selected) fetchPositions(selected); else setNewPosition((prev) => ({ ...prev, id: "" })); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-blue-200">
                        <option value="">Select Existing Department</option>
                        {departments.map((dept) => (<option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">New Position</label>
                      <div className="flex gap-2">
                        <input placeholder="Position ID" value={newPosition.id} readOnly disabled={!selectedDeptIdForPosition} className={`flex-1 px-3 py-2 border rounded-lg focus:ring focus:ring-blue-200 ${!selectedDeptIdForPosition ? "bg-gray-100 cursor-not-allowed border-gray-200" : "bg-gray-50 border-gray-300"}`} />
                        <input placeholder="Position Name" value={newPosition.name} onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })} disabled={!selectedDeptIdForPosition} className={`flex-1 px-3 py-2 border rounded-lg focus:ring focus:ring-blue-200 ${!selectedDeptIdForPosition ? "bg-gray-100 cursor-not-allowed border-gray-200" : "border-gray-300"}`} />
                      </div>
                    </div>

                    <button type="button" onClick={() => handleAddPosition({ newPosition, selectedDeptIdForPosition, setNewEmployee, resetFormStates: () => { setNewPosition({ id: "", name: "" }); setSelectedDeptIdForPosition(""); }, })} className="self-start px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add Position</button>
                  </div>
                )}

                {!employee && (
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="openAssignAfterSave" checked={openAssignAfterSave} onChange={(e) => setOpenAssignAfterSave(e.target.checked)} className="w-4 h-4" />
                    <label htmlFor="openAssignAfterSave" className="text-sm text-gray-700">Open Assign Shift after saving</label>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              {currentStep === 2 && (<button type="button" onClick={() => setCurrentStep(1)} className="px-4 py-2 text-sm text-white bg-gray-500 rounded-lg hover:bg-gray-600">Back</button>)}
              <div className="flex gap-3 ml-auto">
                {currentStep === 1 && (<button type="button" onClick={handleNext} className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">Next</button>)}
                {currentStep === 2 && (<button type="submit" className="px-5 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">Submit</button>)}
                <button type="button" onClick={onClose} className="px-5 py-2 text-sm text-white bg-gray-600 rounded-lg hover:bg-gray-700">Cancel</button>
              </div>
            </div>
          </form>
        </motion.div>

        {loading && (
          <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-opacity-50 z-[60]">
            <div className="w-16 h-16 border-b-2 border-black rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {showCredModal && credentials && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4">User Info</h2>

            {/* If user was created, show username + password */}
            {credentials.password && (
              <>
                <p className="mb-2"><strong>Employee ID:</strong> {credentials.employee_id}</p>
                <p className="mb-2"><strong>Username:</strong> {credentials.username}</p>
                <p className="mb-2"><strong>Password:</strong> <span className="font-mono">{credentials.password}</span></p>
                {credentials.email && <p className="mb-2"><strong>Email:</strong> {credentials.email}</p>}
              </>
            )}

            {/* If user_id was updated, show old/new */}
            {credentials.user_id_new && (
              <>
                <p className="mb-2"><strong>Username:</strong> {credentials.username}</p>
                <p className="mb-2"><strong>User ID (old → new):</strong> {credentials.user_id_old} → {credentials.user_id_new}</p>
                {credentials.email && <p className="mb-2"><strong>Email:</strong> {credentials.email}</p>}
              </>
            )}

            <div className="flex gap-2 mt-4">
              {credentials.username && <button type="button" onClick={() => copyToClipboard(credentials.username)} className="px-4 py-2 bg-gray-200 rounded-md">Copy Username</button>}
              {credentials.password && <button type="button" onClick={() => copyToClipboard(credentials.password)} className="px-4 py-2 bg-gray-200 rounded-md">Copy Password</button>}
              <button type="button" onClick={() => { setShowCredModal(false); setCredentials(null); }} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

EmployeeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  employee: PropTypes.object,
  onOpenAssign: PropTypes.func,
};

export default EmployeeModal;
