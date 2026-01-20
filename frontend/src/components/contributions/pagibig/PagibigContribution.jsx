import { useEffect, useState } from "react";
import PagibigContributionModal from "./PagibigContributionModal"; // Import the modal component
import Swal from "sweetalert2"; // Import SweetAlert for notifications
import { Tooltip } from "react-tooltip";
import BASE_URL from '../../../../backend/server/config'; 
import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";

const PagibigContribution = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${BASE_URL}/contributions/pagibig/pagibig_contribution.php`);
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError("Failed to fetch data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const breadcrumbItems = [
    { label: 'Contributions Dashboard', path: '/contributions' },
    { label: 'Pagibig Contributions' },
  ];

  return (
    <div className="container">
      {/* <h2 className="text-2xl font-bold mb-4">PAG-IBIG Contributions</h2> */}
      <div className="flex flex-col gap-y-2  w-full pb-3 Glc-dashboard-bg-header border-b-2 pl-5 sticky mb-5">
        <span className='text-2xl font-semibold'>Pagibig Contributions</span>
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <div className="table_container">
        <div className="table_wrapper"> 
          <table className="table_content">
            <thead className='table_head Glc-tableheader'>
              <tr className="tr_box uppercase text-resize text-left">
                <th className="Glc-tableheader-text px-4 py-2 flex flex-col">
                  Emplyee Details
                </th>
                <th className="Glc-tableheader-text px-4 py-2 flex flex-col text-left">
                  Share
                </th>
                
                <th className="Glc-tableheader-text px-4 py-2 flex flex-col">
                  Salary
                </th>
                <th className="Glc-tableheader-text px-4 py-2 flex flex-col">
                  Total Contribution
                </th>

                <th className="Glc-tableheader-text px-4 py-2 flex flex-col">
                  Total Salary
                </th>

                <th className="Glc-tableheader-text px-4 py-2 flex flex-col">
                  Actions
                </th> {/* Added Actions column for editing */}
              </tr>
              {/* <tr>
                <th>ID</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>PAG-IBIG ID</th>
                <th>Employee Share</th>
                <th>Employer Share</th>
                <th>Salary</th>
                <th>Semi-Monthly Salary</th>
                <th>Total Contribution</th>
                <th>Total Salary</th>
                <th>Actions</th> 
              </tr> */}
            </thead>
            <tbody>
            {data.map((item, index) => (
                <tr 
                  key={item.pagibig_contribution_id} 
                  className={`hover:bg-gray-300 
                    ${index % 2 === 0 ? " Glc-table-background-color2" : "Glc-table-background"}
                    ${index % 1 === 0 ? " Glc-table-bordertop" : ""}
                  `}
                >

                  <td className="px-4 py-2 flex flex-col">
                    <div className=' w-full text-left text-[20px] border-b-[1px] font-bold'>
                        {item.employee_name}
                    </div>
                    <div className=' w-full text-left text-[11px]'>
                        Emp. ID: <strong className='font-bold text-[15px]'>{item.employee_id}</strong>
                    </div>
                    <div className='w-full text-left text-[11px]'>
                        Pag-ibig ID: <strong className='font-bold text-[15px]'>{item.pagibig_ID}</strong> 
                    </div>
                  </td>

                  <td className="flex-1 px-4 w-full flex-col">
                    <div className=' text-[13px] w-full gap-x-2 grid grid-cols-2 grid-rows-1'>
                      <div className='text-right'>Employee Share:</div>
                      <div className='font-bold text-[14px] text-left'>{item.employee_share}</div>
                        {/* Employee Share: <strong className='font-bold text-[15px]'>{item.employee_share}</strong> */}
                    </div>
                    <div className=' text-[13px] w-full gap-x-2 grid grid-cols-2 grid-rows-1'>
                      <div className='text-right'>Employer Share:</div>
                      <div className='font-bold text-[14px] text-left'>{item.employee_share}</div>
                        {/* Employer Share: <strong className='font-bold text-[15px]'>{item.employer_share}</strong>  */}
                    </div>
                  </td>

                  <td className="lex-1 px-4 w-full flex-col">
                    <div className=' text-[13px] w-full gap-x-2 grid grid-cols-2 grid-rows-1'>
                      <div className='text-right'>Salary:</div>
                      <div className='font-bold text-[14px] text-left'>{item.salary}</div>
                        {/* Salary: <strong className='font-bold text-[15px]'>{item.salary}</strong> */}
                    </div>
                    <div className='text-[12px] w-full gap-x-2 grid grid-cols-2 grid-rows-1'>
                        <div className='text-right'>Semi Monthly Salary:</div>
                        <div className='font-bold text-[14px] text-left'>{item.semi_monthly_salary}</div>
                        {/* Semi Monthly Salary: <strong className='font-bold text-[15px]'>{item.semi_monthly_salary}</strong>  */}
                    </div>
                  </td>

                  <td className="px-4 py-2 flex flex-col">
                    {item.total_contribution}
                  </td>
                  
                  <td className="px-4 py-2 flex flex-col">
                    {item.total_salary}
                  </td>
                  
                  <td className="px-4 py-2 flex flex-col">
                    <button data-tooltip-id="Edit" data-tooltip-content="Edit"
                        className="btn-edit btn-logo-Size-Position" 
                        onClick={() => handleEdit(item)}>
                        <img src="/systemImage/editBTN.png" alt="btn-edit" className='btn-imagesize' />
                        <Tooltip id="Edit"/>
                    </button>
                  </td>
                  
                </tr>

                // <tr key={item.pagibig_contribution_id}>
                //   <td>{item.pagibig_contribution_id}</td>
                //   <td>{item.employee_id}</td>
                //   <td>{item.employee_name}</td>
                //   <td>{item.pagibig_ID}</td>
                //   <td>{item.employee_share}</td>
                //   <td>{item.employer_share}</td>
                //   <td>{item.salary}</td>
                //   <td>{item.semi_monthly_salary}</td>
                //   <td>{item.total_contribution}</td>
                //   <td>{item.total_salary}</td>
                //   <td>
                //     <button onClick={() => handleEdit(item)}>Edit PAG-IBIG ID</button> {/* Edit button */}
                //   </td>
                // </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>    

      <PagibigContributionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedRecord={selectedRecord}
        refreshData={() => {
          // Fetch data again after updating
          setLoading(true);
          fetch(`${BASE_URL}/contributions/pagibig/pagibig_contribution.php`)
            .then((response) => response.json())
            .then((result) => {
              if (result.success) {
                setData(result.data);
                Swal.fire("Success!", "Data refreshed successfully.", "success");
              } else {
                setError(result.message);
              }
              setLoading(false);
            })
            .catch((err) => {
              setError("Failed to fetch data: " + err.message);
              setLoading(false);
            });
        }}
      />
    </div>
  );
};

export default PagibigContribution;