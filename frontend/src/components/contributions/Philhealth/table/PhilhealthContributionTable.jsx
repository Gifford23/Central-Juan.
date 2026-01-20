import React, { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
import BASE_URL from '../../../../../backend/server/config'; // Ensure this path is correct
import Breadcrumbs from "../../../breadcrumbs/Breadcrumbs";

const PhilhealthContributionTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContributions = () => {
    setLoading(true);
    fetch(`${BASE_URL}/contributions/philhealth/table/philhealth_table.php`)
      .then((response) => response.json())
      .then((result) => {
        console.log("Fetched Data:", result.data); // Debugging API response
        if (result.success && Array.isArray(result.data)) {
          setData(result.data);
        } else {
          setError("Invalid data format received from server.");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch data");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContributions();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const breadcrumbItems = [
    { label: 'Contributions Dashboard', path: '/contributions' },
    { label: 'Philhealth Table' },
  ];

  return (
    <div className="container">
      {/* <h2 className="text-2xl font-bold mb-4">Philhealth Contributions Table</h2> */}
      <div className="flex flex-col gap-y-2  w-full pb-3 Glc-dashboard-bg-header border-b-2 pl-5 sticky mb-5">
        <span className='text-2xl font-semibold'>Philhealth Contributions Table</span>
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <div className="table_container">
        <div className="table_wrapper"> 
          <table className="">
            <thead className='table_head Glc-tableheader'>
              <tr className="tr_box uppercase text-resize text-left ">
                <th className="Glc-tableheader-text px-4 py-2">ID</th>
                <th className="Glc-tableheader-text px-4 py-2">Salary Range Min</th>
                <th className="Glc-tableheader-text px-4 py-2">Salary Range Max</th>
                <th className="Glc-tableheader-text px-4 py-2">Employee Share</th>
                <th className="Glc-tableheader-text px-4 py-2">Employer Share</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-gray-300 
                    ${index % 2 === 0 ? "Glc-table-background-color2" : "Glc-table-background"}
                    ${index % 1 === 0 ? "Glc-table-bordertop" : ""}
                  `}
                >
                  <td className="px-4 py-2">{item.id}</td>
                  <td className="px-4 py-2">{item.salary_range_min}</td>
                  <td className="px-4 py-2">{item.salary_range_max}</td>
                  <td className="px-4 py-2 font-bold text-[15px]">{item.employee_share}</td>
                  <td className="px-4 py-2 font-bold text-[15px]">{item.employer_share}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PhilhealthContributionTable;
