import React, { useState, useEffect } from 'react';
import BASE_URL from '../../../backend/server/config'; // Adjust the path as necessary
import "../../../Styles/components/employee/EmployeeNamefetch.css"

function EmployeeNamefetch({searchQuery}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  // const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${BASE_URL}/employeesSide/employees.php`);
        const data = await response.json();
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

  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.first_name} ${employee.middle_name || ""} ${employee.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <>
{loading ? (
  <p className="text-gray-600">Loading employees...</p>
) : (
  <div className="empnamefetch-table">
    {filteredEmployees.map((employee, index) => (
        <div
          key={employee.employee_id}
          className={`nb-employeenamefetch-hovercolor flex flex-row gap-x-6 py-1 px-2 items-center
            ${index % 1 === 0 ? "border-t border-black/30" : ""}
          `}
        >
          {/* Employee Details */}
          <div className="w-[250px] h-fit flex flex-col overflow-hidden">
            <div className="Glb-table-contentoverflow_contentscroll">
              {`${employee.first_name} ${employee.middle_name || ""} ${employee.last_name}`}
            </div>
            <div className="Glb-table-contentoverflow_contentscroll">
              {employee.employee_id || "N/A"}
            </div>
          </div>

          {/* Department */}
          <div className="w-[150px] h-fit flex flex-col overflow-hidden">
            <div className="Glb-table-contentoverflow_contentscroll empnamefetch-table-contentoverflow_contentscroll">
              {employee.department_name || "N/A"}
            </div>
          </div>

          {/* Position */}
          <div className="w-[150px] h-fit flex flex-col overflow-hidden">
            <div className="Glb-table-contentoverflow_contentscroll empnamefetch-table-contentoverflow_contentscroll">
              {employee.position_name || "N/A"}
            </div>
          </div>

          {/* Base Salary */}
          <div className="w-[120px] h-fit flex flex-col overflow-hidden">
            <div className="Glb-table-contentoverflow_contentscroll empnamefetch-table-contentoverflow_contentscroll">
              {employee.base_salary || "N/A"}
            </div>
          </div>
        </div>
      ))}
    </div>
  
)}

    </>
  );
}

export default EmployeeNamefetch;

