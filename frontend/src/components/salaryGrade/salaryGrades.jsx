import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import SalaryGradeModal from './SalaryGradeModal';
import '../../../Styles/components/salaryGrade/salarygrade.css';
import { useLocation, useOutletContext } from 'react-router-dom';
import '../../../Styles/globals.css';
import Swal from 'sweetalert2';
import BASE_URL from '../../../backend/server/config'; 
import { CirclePlus, Search, Plus } from "lucide-react";
import Breadcrumbs from '../breadcrumbs/Breadcrumbs';
import { useSession } from '../../context/SessionContext';
import { Tooltip } from '@mui/material';
import { tooltipClasses } from '@mui/material/Tooltip';

const SalaryGrades = () => {
    const [salaryGrades, setSalaryGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { state } = useLocation();
    const { user } = useSession(); // Access user from Outlet context
    const tableWrapperRef = useRef(null);

    // Function to fetch salary grades data
    const fetchSalaryGrades = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/salaryGrades/salary_grades.php`);
            if (response.data.success) {
                const parsedData = response.data.data.map(grade => ({
                    ...grade,
                    Step1: Number(grade.Step1),
                    Step2: Number(grade.Step2),
                    Step3: Number(grade.Step3),
                }));
                setSalaryGrades(parsedData);
            } else {
                setError('No records found.');
            }
        } catch (error) {
            console.error('Error fetching salary grades:', error);
            setError('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch salary grades on component mount
    useEffect(() => {
        fetchSalaryGrades();
    }, []);

    const handleEdit = (grade) => {
        setSelectedGrade(grade);
        setModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedGrade(null); // Set to null for adding a new grade
        setModalOpen(true);
    };

    const handleDelete = (gradeId) => {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!"
        }).then((result) => {
            if (result.isConfirmed) {
                axios.delete(`${BASE_URL}/salaryGrades/delete_salary_grades.php?id=${gradeId}`)
                    .then(response => {
                        if (response.data.success) {
                            setSalaryGrades(salaryGrades.filter(grade => grade.GradeID !== gradeId));
                            Swal.fire({
                                icon: "success",
                                title: "Deleted!",
                                text: "Salary grade deleted successfully.",
                            });
                        } else {
                            Swal.fire({
                                icon: "error",
                                title: "Oops!",
                                text: response.data.message || "Failed to delete record.",
                            });
                        }
                    })
                    .catch(error => {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: "Error: " + error.message,
                        });
                    });
            }
        });
    };
    
    

    const handleSave = (newGrade) => {
        setModalLoading(true); // Start loading state for modal
    
        const payload = {
            grade_id: newGrade.grade_id,
            position_level: newGrade.position_level,
            step1: Number(newGrade.step1),
            step2: Number(newGrade.step2),
            step3: Number(newGrade.step3),
        };
    
        const url = selectedGrade 
            ? `${BASE_URL}/salaryGrades/update_salary_grades.php`
            : `${BASE_URL}/salaryGrades/add_salary_grades.php`;
    
        axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 5000,
        })
        .then(response => {
            setModalLoading(false);
            if (response.data.success) {
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: response.data.message || "Salary grade saved successfully.",
                }).then(() => {
                    fetchSalaryGrades(); // Fetch updated salary grades after successful save
                    setModalOpen(false); // Close the modal
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Failed",
                    text: response.data.message || "Failed to save salary grade.",
                });
            }
        })
        .catch(error => {
            setModalLoading(false);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Error saving salary grade: " + error.message,
            });
            console.error("Error saving salary grade:", error);
        });
    };

    // Filtered salary grades based on search query
    const filteredSalaryGrades = salaryGrades.filter(grade => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        return (
            (grade.GradeID && grade.GradeID.toLowerCase().includes(lowerCaseQuery)) ||
            (grade.PositionLevel && grade.PositionLevel.toLowerCase().includes(lowerCaseQuery))
        );
    });

    const breadcrumbItems = [
        // { label: 'Home', path: '/' },
        { label: 'Utilities Dashboard', path: '/utilitiesdashboard' },
        { label: 'Salary Grades' },
    ];

    return (
        <div className="container gap-y-4">

            <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
                <span className='text-2xl font-semibold'>Salary Grades</span>
                <Breadcrumbs items={breadcrumbItems} />
            </div>

            <div className='flex flex-row w-full h-fit gap-x-4'>
                <div className="relative">
                    <input
                    type="text"
                    placeholder="Search"
                    className="h-10 p-2 pl-10 pr-3 rounded-lg shadow-inner nb-department-input w-150" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute transform -translate-y-1/2 left-3 top-1/2">
                    <Search size={18} className="text-gray-600" /> 
                    </div>
                </div>
        
                <>
                    {user.role === 'ADMIN' && (
                    <Tooltip 
                        title="Add Salary Grade"
                        placement="bottom"
                        slotProps={{
                            popper: {
                            sx: {
                                [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
                                {
                                    marginTop: '7px',
                                    backgroundColor: '#46494c',
                                }
                            }
                            }
                        }}
                    >
                        <button   
                        //Add Depeartment 
                        className="items-center w-10 h-10 rounded-lg cursor-pointer hover:transition hover:duration-400 hover:ease-out hover:scale-95 place-items-center employee-newheaderbuttons-solid"
                        onClick={() => handleAdd(true)}
                        >
                        <Plus size={25} fontWeight={20}/>
                        </button>
                    </Tooltip>
                    )}
                </>
            </div>

            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {loading ? (
                <p className="text-gray-600">Loading salary grades...</p>
            ) : ( 
                <div className="salaryGrade-table-container rounded-[15px] text-sm">
                    <div className="salaryGrade-table-wrapper" ref={tableWrapperRef}>
                        <table className="min-w-full border-gray-300 salaryGrade-table-content">
                            <thead className="salaryGrade-table-head Glc-tableheader">
                                <tr className="uppercase text-resize">
                                    <th className="px-4 py-2 Glc-tableheader-text">Grade ID</th>
                                    <th className="px-4 py-2 Glc-tableheader-text">Position Level</th>
                                    <th className="px-4 py-2 Glc-tableheader-text">Step 1</th>
                                    <th className="px-4 py-2 Glc-tableheader-text">Step 2</th>
                                    <th className="px-4 py-2 Glc-tableheader-text">Step 3</th>
                                    {user?.role === 'ADMIN' && 
                                        <th className="px-4 py-2 Glc-tableheader-text">Actions</th>
                                    }
                                </tr>
                            </thead>
                            <tbody>
                            {filteredSalaryGrades.map((grade, index) => (
                                <tr 
                                    className={`hover:bg-gray-300 pt-6 
                                        ${ index % 2 === 0 ? "Glc-table-background-color2" : "Glc-table-background" }
                                        ${ index % 1 === 0 ? "Glc-table-bordertop" : "" }
                                    `} 
                                    key={`${grade.GradeID}-${index}`}
                                >
                                        <td className="px-4 py-2">{grade.GradeID}</td>
                                        <td className="px-4 py-2">{grade.PositionLevel}</td>
                                        <td className="px-4 py-2">{grade.Step1}</td>
                                        <td className="px-4 py-2">{grade.Step2}</td>
                                        <td className="px-4 py-2">{grade.Step3}</td>
                                        {user?.role === "ADMIN" && (
                                            <td className="px-4 py-2">
                                                <div className='flex gap-x-3'>
                                                    <button data-tooltip-id='Edit' data-tooltip-content='Edit' title='Edit'
                                                        className="btn-edit btn-logo-Size-Position" onClick={() => handleEdit(grade)}>
                                                        <img src="/systemImage/editBTN.png" alt="btn-edit" className='btn-imagesize' />
                                                        {/* <Tooltip id='Edit'/> */}
                                                    </button>
                                                    <button data-tooltip-id='Delete' data-tooltip-content='Delete' title='Delete'
                                                        className="btn-delete btn-logo-Size-Position" onClick={() => handleDelete(grade.GradeID)}>
                                                        <img src="/systemImage/deleteBTN.png" alt="-delete-logo" className='btn-imagesize' />
                                                        {/* <Tooltip id='Delete'/> */}
                                                    </button>
                                                </div>
                                                </td>    
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modalOpen && (
                <SalaryGradeModal
                    grade={selectedGrade}
                    modalLoading={modalLoading}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default SalaryGrades;