// services/employeeAndDepAPI/employeeAndDepService.js
import BASE_URL from "../../../../backend/server/config";

export const fetchPositionsAPI = async (departmentId) => {
  if (!departmentId) return [];
  const res = await fetch(
    `${BASE_URL}/departments/positions/fetch_positions.php?department_id=${departmentId}`
  );
  return res.json();
};

export const addDepartmentAPI = async (department) => {
  const res = await fetch(`${BASE_URL}/departments/add_department.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(department),
  });
  return res.json();
};

export const addPositionAPI = async (position) => {
  const res = await fetch(`${BASE_URL}/departments/positions/add_positions.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(position),
  });
  return res.json();
};

export const fetchDepartmentsAPI = async () => {
  try {
    const res = await fetch(`${BASE_URL}/departments/department.php`);
    const data = await res.json();
    if (data.message) {
      console.warn("Fetch Departments Warning:", data.message);
      return { status: "error", message: data.message, data: [] };
    }
        console.log("Raw response from API:", data);
    return { status: "success", data: data.data || [] };
  } catch (err) {
    console.error("Error fetching departments:", err);
    return { status: "error", message: "Failed to fetch departments", data: [] };
  }
};

export const fetchPositionsByDeptAPI = async (departmentId) => {
  if (!departmentId) return [];
  const res = await fetch(`${BASE_URL}/positions/positions.php?department_id=${departmentId}`);
  return res.json();
};




// export const handleAddDepartment = async (newDepartment) => {
//   try {
//     const response = await fetch(`${BASE_URL}/departments/add_department.php`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(newDepartment),
//     });

//     const data = await response.json();

//     if (data.status === "success") {
//       Swal.fire("Success!", "Department saved successfully!", "success");
//       // Optionally refresh department list
//       setDepartments((prev) => [...prev, newDepartment]);
//     } else {
//       Swal.fire("Error!", data.message || "Failed to save department", "error");
//     }
//   } catch (error) {
//     console.error("Error saving department:", error);
//     Swal.fire("Error!", "Something went wrong.", "error");
//   }
// };

