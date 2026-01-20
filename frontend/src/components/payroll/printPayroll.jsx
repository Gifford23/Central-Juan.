import React from 'react';

const PrintPayroll = ({ payroll }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="print-payroll p-5 bg-white shadow-lg rounded-lg max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-center mb-4">Payroll Details</h1>
            <table className="min-w-full border-collapse border border-gray-300">
                <tbody>
                    <tr>
                        <td className="border border-gray-300 p-2 font-semibold">Payroll ID:</td>
                        <td className="border border-gray-300 p-2">{payroll.payroll_id}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-semibold">Employee ID:</td>
                        <td className="border border-gray-300 p-2">{payroll.employee_id}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-semibold">Name:</td>
                        <td className="border border-gray-300 p-2">{payroll.name}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-semibold">Department:</td>
                        <td className="border border-gray-300 p-2">{payroll.department_id}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-semibold">Position:</td>
                        <td className="border border-gray-300 p-2">{payroll.position_id}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-semibold">Date From:</td>
                        <td className="border border-gray-300 p-2">{new Date(payroll.date_from).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-semibold">Date Until:</td>
                        <td className="border border-gray-300 p-2">{new Date(payroll.date_until).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-semibold">Total Days:</td>
                        <td className="border border-gray-300 p-2">{payroll.total_days}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-semibold">Total Salary:</td>
                        <td className="border border-gray-300 p-2">{payroll.total_salary}</td>
                    </tr>
                </tbody>
            </table>
            <button 
                onClick={handlePrint} 
                className="mt-4 w-full bg-blue-500 text-white font-semibold py-2 rounded hover:bg-blue-600 transition duration-200"
            >
                Print Payroll
            </button>
        </div>
    );
};

export default PrintPayroll;