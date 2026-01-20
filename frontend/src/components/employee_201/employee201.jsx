import { useState, useEffect } from "react";
import axios from 'axios';
import 'tailwindcss';
import '../../../Styles/components/employee_201/employee201.css';
import { User } from "lucide-react";
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";

const Employee201 = () => {
    const [payrollData, setPayrollData] = useState([]);
    const [activeTab, setActiveTab] = useState(1);

    const toggleTab = (tabIndex) => {
        setActiveTab(tabIndex);
    };

    const fetchPayrolls = async () => {
        try {
            const response = await axios.get('http://10.0.254.104/central_juan/backend/payroll/payroll.php');
            if (response.data.success) {
                setPayrollData(response.data.data);
            } else {
                setError(response.data.message);
            }
            setLoading(false);
        } catch (error) {
            setError('Error fetching data: ' + error.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayrolls();
    }, []);

    const breadcrumbItems = [
        // { label: 'Home', path: '/' },
        { label: 'Employee Dashboard', path: '/employeedashboard' },
        { label: 'Employee 201' },
      ];

    return (
        <div className="container employee-201-container gap-y-4">
            
            <div className="flex flex-col gap-y-2  w-full pb-3 Glc-dashboard-bg-header border-b-2 pl-5 sticky">
                <span className='text-2xl font-semibold'>Employee 201 Files</span>
                <Breadcrumbs items={breadcrumbItems} />
            </div>

            <div className="grid grid-cols-6 grid-rows-5 gap-3 h-full w-full">       
                <div className="row-span-5 col-start-1 row-start-1 border-2 flex flex-col">
                    {/* Employee List */}
                    <div className="employee201-employee-list">
                        {payrollData.map((payroll) => (
                            <div key={payroll.payroll_id} className="w-full h-fit border-1 bg-gray-200 p-1 px-2 rounded-md">
                                <div className="w-full border-b-1 font-semibold text-md">{payroll.name}</div>
                                <div className='flex flex-col'>
                                    <p className="text-sm font-light">Department: {payroll.department_id}</p>
                                    <p className="text-sm font-light">Position: {payroll.position_id}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-4 col-start-2 row-start-1 border-2 flex flex-row p-1 gap-x-1">
                    <div className="w-30 h-full rounded-xl border-1 text-center content-center">
                        Profile Pic
                    </div>
                    <div className="flex flex-3 rounded-xl border-1 h-full"></div>
                </div>

                <div className="col-span-4 row-span-4 col-start-2 row-start-2 flex flex-col border-2">
                    <div className="flex flex-row h-fit w-full p-1 pb-0 gap-x-2 ">
                        <button onClick={() => toggleTab(1)} className={`h-10 w-full rounded-md rounded-b-none cursor-pointer bg-green-200 text-center content-center activeTab === 1 ? "active" : ""`}>Tab 1</button>
                        <button onClick={() => toggleTab(2)} className={`h-10 w-full rounded-md rounded-b-none cursor-pointer bg-blue-200 text-center content-center activeTab === 2 ? "active" : ""`}>Tab 2</button>
                        <button onClick={() => toggleTab(3)} className={`h-10 w-full rounded-md rounded-b-none cursor-pointer bg-red-200 text-center content-center activeTab === 3 ? "active" : ""`}>Tab 3</button>
                        <button onClick={() => toggleTab(4)} className={`h-10 w-full rounded-md rounded-b-none cursor-pointer bg-yellow-200 text-center content-center activeTab === 4 ? "active" : ""`}>Tab 4</button>
                        <button onClick={() => toggleTab(5)} className={`h-10 w-full rounded-md rounded-b-none cursor-pointer bg-orange-200 text-center content-center activeTab === 5 ? "active" : ""`}>Tab 5</button>
                    </div>
                    <div className="flex h-full w-full">
                        {activeTab === 1 && <div className="h-full w-full bg-green-200">Content for Tab 1</div>}
                        {activeTab === 2 && <div className="h-full w-full bg-blue-200">Content for Tab 2</div>}
                        {activeTab === 3 && <div className="h-full w-full bg-red-200">Content for Tab 3</div>}
                        {activeTab === 4 && <div className="h-full w-full bg-yellow-200">Content for Tab 4</div>}
                        {activeTab === 5 && <div className="h-full w-full bg-orange-200">Content for Tab 5</div>}
                    </div>
                </div>

                <div className="col-start-6 row-start-1 border-2">
                Actions
                </div>

                <div className="col-start-6 row-start-2 border-2">
                    Extra Info
                </div>

                <div className="row-span-3 col-start-6 row-start-3 border-2">
                Statistics
                </div>

            </div>
        
        </div>
    );
};

export default Employee201;