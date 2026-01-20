import { useEffect, useState } from "react";
import BASE_URL from "../../../../backend/server/config";

const useEmployeeDropdown = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${BASE_URL}/loan_api/get_all_employees.php`);
      const json = await res.json();
      
      if (json.success) {
        setEmployees(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return { employees, loading };
};

export default useEmployeeDropdown;
