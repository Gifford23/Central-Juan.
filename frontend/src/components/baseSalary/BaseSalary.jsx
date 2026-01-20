import React, { useState, useEffect } from 'react';
import BASE_URL from '../../../backend/server/config'; 
import '../../../Styles/components/baseSalary/basesalary.css';
import BaseSalaryModal from './BaseSalaryModal';
import Breadcrumbs from '../breadcrumbs/Breadcrumbs';

const BaseSalary = () => {
  const [baseSalaries, setBaseSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSalary, setCurrentSalary] = useState(null);

  useEffect(() => {
    fetchBaseSalaries();
  }, []);

  const fetchBaseSalaries = async () => {
    try {
      const response = await fetch(`${BASE_URL}/baseSalary/base_salary.php`);
      const data = await response.json();
      if (data.success) {
        setBaseSalaries(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };


  
// useEffect(() => {
//   // Function to fetch base salaries
//   const fetchBaseSalaries = async () => {
//     try {
//       const response = await fetch(`${BASE_URL}/baseSalary/base_salary.php`);
//       const data = await response.json();
//       if (data.success) {
//         setBaseSalaries(data.data);
//         setError(null);
//       } else {
//         setError(data.message);
//       }
//     } catch (err) {
//       setError('Failed to fetch data.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Initial fetch
//   fetchBaseSalaries();

//   // Set up 5-second polling
//   const intervalId = setInterval(fetchBaseSalaries, 5000);

//   // Cleanup on unmount
//   return () => clearInterval(intervalId);
// }, []);



  const handleDelete = async (id) => {
    try {
      await fetch(`${BASE_URL}/baseSalary/delete_base_salary.php?id=${id}`, { method: 'DELETE' });
      fetchBaseSalaries();
    } catch (err) {
      alert('Failed to delete record.');
    }
  };

  const handleSave = async (salary) => {
    try {
      const url = salary.base_salary_id
        ? `${BASE_URL}/baseSalary/update_base_salary.php`
        : `${BASE_URL}/backend/baseSalary/add_base_salary.php`;

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salary),
      });
      fetchBaseSalaries();
      closeModal();
    } catch (err) {
      alert('Failed to save record.');
    }
  };

  const openModal = (salary = null) => {
    setCurrentSalary(salary);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setCurrentSalary(null);
    setIsModalOpen(false);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  const breadcrumbItems = [
    // { label: 'Home', path: '/' },
    { label: 'Payroll Dashboard', path: '/payrolldashboard' },
    { label: 'Base Salary' },
  ];


  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-2  w-full pb-3 Glc-dashboard-bg-header border-b-2 pl-5 sticky">
        <span className='text-2xl font-semibold'>Base Salary Records</span>
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <table className="Glb-table shadow-md">
        <thead>
          <tr className='Glb-group-1 Glc-tableheader basesalary-group-1'>
            {/* <th className="Glb-table-headeroverflow Glc-tableheader-text">Base Salary ID</th> */}
            <th className="Glb-table-headeroverflow Glc-tableheader-text">Employee ID</th>
            <th className="Glb-table-headeroverflow Glc-tableheader-text">Employee Name</th>
            <th className="Glb-table-headeroverflow Glc-tableheader-text">Basic Salary</th>
            <div className="basesalary-header-action Glc-tableheader-text">Action</div>
          </tr>
        </thead>
        <tbody>
          {baseSalaries.map((salary, index) => (
            <tr key={salary.base_salary_id} 
              className={`Glb-group-2 basesalary-group-2 hover:bg-gray-300 py-1 
                ${index % 2 === 0 ? "Glc-table-background-color2" : "Glc-table-background"}
                ${index % 1 === 0 ? "Glc-table-bordertop" : ""}
              `}
            >
              {/* <td className="Glb-table-contentoverflow basesalary-content-textelipis">{salary.base_salary_id || 'n/a'}</td> */}
              <td className="Glb-table-contentoverflow basesalary-content-textelipis">{salary.employee_id || 'n/a'}</td>
              <td className="Glb-table-contentoverflow basesalary-content-textelipis">
                {`${salary.first_name || ''} ${salary.middle_name || ''} ${salary.last_name || ''}`.trim() || 'n/a'}
              </td>
              <td className="Glb-table-contentoverflow basesalary-content-textelipis">{parseFloat(salary.basic_salary).toFixed(2) || 'n/a'}</td>
              <div className="basesalary-content-action">
                <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => openModal(salary)}>Edit</button>
              </div>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center basesalary-bgcolor">
          <div className="bg-white p-6 rounded-xl shadow-lg w-90">
            <h3 className="text-xl font-semibold mb-4">{currentSalary ? 'Edit Base Salary' : 'Add Base Salary'}</h3>
            <label>Employee ID:</label>
            <input
              type="text"
              value={currentSalary?.employee_id || ''}
              disabled
              className="block w-full p-2 mb-2 border rounded cursor-not-allowed"
            />
            <label>Employee Name:</label>
            <input
              type="text"
              value={
                `${currentSalary?.first_name || ''} ${currentSalary?.middle_name || ''} ${currentSalary?.last_name || ''}`.trim()
              }
              disabled
              className="block w-full p-2 mb-2 border rounded cursor-not-allowed"
            />
            <label>Basic Salary:</label>
            <input
              type="number"
              value={currentSalary?.basic_salary || ''}
              onChange={(e) => setCurrentSalary({ ...currentSalary, basic_salary: e.target.value })}
              className="block w-full p-2 mb-4 border rounded"
            />
            <div className="flex justify-end">
              <button className="bg-blue-500 text-white px-4 py-2 rounded mr-2" onClick={() => handleSave(currentSalary)}>Save</button>
              <button className="bg-gray-500 text-white px-4 py-2 rounded" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseSalary;
