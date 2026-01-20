import { useEffect, useState } from "react";
import BASE_URL from '../../../../../backend/server/config'; 
import Breadcrumbs from "../../../breadcrumbs/Breadcrumbs";

const SSSContributionTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/contributions/sss/table/sss_contribution_table.php`)
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch data");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const breadcrumbItems = [
    { label: 'Contributions Dashboard', path: '/contributions' },
    { label: 'SSS Table' },
  ];

  return (
    <div className="container">
      {/* <h2 className="p-5 text-3xl">SSS TABLE </h2> */}
      <div className="flex flex-col gap-y-2  w-full pb-3 Glc-dashboard-bg-header border-b-2 pl-5 sticky mb-5">
        <span className='text-2xl font-semibold'>SSS Table</span>
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <table border="1">
        <thead className="text-2xl w-full h-25 break-all flex Glc-tableheader">
          <tr className=" break-all text-[18px] ">
            <th className="Glc-tableheader-text flex flex-1 justify-center break-words">ID</th>
            <th className="Glc-tableheader-text flex flex-1 justify-center break-words">Salary From </th>
            <th className="Glc-tableheader-text flex flex-1 justify-center break-words">Salary To </th>
            {/* className="Glc-tableheader-text flex flex-1 justify-center break-words" <th>SSS ID</th> */}
            <th className="Glc-tableheader-text flex flex-1 justify-center break-words">Employer Share</th>
            <th className="Glc-tableheader-text flex flex-1 justify-center break-words">Employee Share</th>
            <th className="Glc-tableheader-text flex flex-1 justify-center break-words">MPF EE </th>
            <th className="Glc-tableheader-text flex flex-1 justify-center break-words">Total Employee Share</th>
            <th className="Glc-tableheader-text flex flex-1 justify-center break-words">Total Contribution </th>
            {/* <th>action </th> */}



          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.id } 
              className={`px-200
                ${index % 2 === 0 ? "Glc-table-background-color2" : "Glc-table-background"}
                ${index % 1 === 0 ? "Glc-table-bordertop" : ""}
              `}
            >
              <td className="flex flex-1 justify-center px-2 py-2">{item.id }</td>
              <td className="flex flex-1 justify-center px-2">{item.salary_from }</td>
              <td className="flex flex-1 justify-center px-2">{item.salary_to}</td>
              <td className="flex flex-1 justify-center px-2">{item.employer_share}</td>
              <td className="flex flex-1 justify-center px-2">{item.employee_share}</td>
              <td className="flex flex-1 justify-center px-2">{item.mpf_ee}</td>
              <td className="flex flex-1 justify-center px-2">{item.total_employee_share}</td>
              <td className="flex flex-1 justify-center px-2">{item.total_contribution}</td>
              {/* <td> EDIT </td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SSSContributionTable;