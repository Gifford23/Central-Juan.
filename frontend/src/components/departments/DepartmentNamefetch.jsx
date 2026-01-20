import React, { useEffect, useState } from 'react';
import BASE_URL from '../../../backend/server/config';
import "../../../Styles/components/Depertment/departmentnamefetch.css"

const DepartmentNamefetch = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${BASE_URL}/departments/department.php`);
        const data = await response.json();
        if (data.message) {
          throw new Error(data.message);
        }
        setDepartments(data.data); // Set the department data
      } catch (error) {
        setError(error.message); // Set the error message
      } finally {
        setLoading(false); // Set loading to false
      }
    };

    fetchDepartments(); // Call the fetch function
  }, []);

  if (loading) return <p>Loading departments...</p>; // Loading state
  if (error) return <p>Error: {error}</p>; // Error state

  return (
    <div className="dptnamefetch-container">
      {departments.map(department => (
        <div key={department.department_id} className="dptnamefetch-boxname">
          {department.department_name}
        </div>
      ))}
    </div>
  );
};

export default DepartmentNamefetch;