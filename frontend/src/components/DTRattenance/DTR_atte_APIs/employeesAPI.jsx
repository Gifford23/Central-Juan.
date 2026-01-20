import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

/**
 * ✅ Fetch all employees (with status + employee_type + department + position)
 */
export const fetchEmployeesAPI = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/employeesSide/employees.php`, {
      headers: { "Content-Type": "application/json" }
    });

    if (Array.isArray(res.data)) {
      return res.data;
    } else {
      console.error("⚠️ Unexpected employees API response:", res.data);
      return [];
    }
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    return [];
  }
};

/**
 * ✅ Fetch employee count
 */
export const fetchEmployeeCountAPI = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/employeesSide/employees.php?count=1`);
    return res.data.total_count || 0;
  } catch (error) {
    console.error("❌ Error fetching employee count:", error);
    return 0;
  }
};
