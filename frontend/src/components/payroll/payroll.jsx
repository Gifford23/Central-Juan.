import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import PayrollModal from "./payrollModal";
import "../../../Styles/components/payroll/payroll.css";
import { useSession } from "../../context/SessionContext";
import "react-datepicker/dist/react-datepicker.css";
import Calendar from "./calendar_UI/calendar";
import {
  Edit,
  AlignJustify,
  Trash2,
  Search,
  Grid3x3,
  Logs,
} from "lucide-react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";
import { CalendarCog, ReceiptText, Printer } from "lucide-react";
import PayrollLog from "./payrollLog";
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import { Tooltip } from "@mui/material";
import { tooltipClasses } from "@mui/material";
// import { handlePrint } from '../../../src/components/payroll/printPayroll';  // Adjust path if needed

const Payroll = () => {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [modalType, setModalType] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [openDropdownDetails, setOpenDropdownDetails] = useState(null);
  const [payrollData, setPayrollData] = useState([]);
  const [selectedPayrolls, setSelectedPayrolls] = useState([]);
  const [showtablelist, setShowTableList] = useState(false);
  const [closetablelist, setCloseTableList] = useState(true);
  const [buttonClicked, setButtonClicked] = useState(false);
  const [showPayrollLog, setShowPayrollLog] = useState(false); // State to control visibility
  const [searchTerm, setSearchTerm] = useState("");
  const modalRef = useRef(null);
  const [showListView, setShowListView] = useState(true);
  const [showGridView, setShowGridView] = useState(false);
  const [activeView, setActiveView] = useState("list");

  // Define a function named goToDepartment that does not take any parameters

  const handleListView = () => {
    setActiveView("list");
    setShowListView(true);
    setShowGridView(false);
  };

  const handleGridView = () => {
    setActiveView("grid");
    setShowListView(false);
    setShowGridView(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closePayrollLog();
      }
    };

    if (showPayrollLog) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPayrollLog]);

  const toggleActionsDropdown = (payrollId) => {
    setOpenDropdownId(openDropdownId === payrollId ? null : payrollId);
  };

  const toggleDetailsDropdown = (payroll) => {
    if (openDropdownDetails === payroll.payroll_id) {
      setOpenDropdownDetails(null);
    } else {
      setOpenDropdownDetails(payroll.payroll_id);
    }
    setOpenDropdownId(false);
  };

  const handleNewButtonClick = () => {
    setShowTableList(false);
    setButtonClicked(false);
    setCloseTableList(true);
    console.log("New button clicked");
  };

  const handleButtonClick = () => {
    setShowTableList(true);
    setButtonClicked(true);
    setCloseTableList(false);
  };

  const filteredPayrollData = useMemo(() => {
    return payrollData.filter((payroll) => {
      const nameMatch = payroll.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const idMatch = payroll.employee_id
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      return nameMatch || idMatch;
    });
  }, [searchTerm, payrollData]);

  const fetchPayrolls = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/payroll/payroll.php`);
      if (response.data.success) {
        setPayrollData(response.data.data);
      } else {
        setError(response.data.message);
      }
      setLoading(false);
    } catch (error) {
      setError("Error fetching data: " + error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const openModal = (type, payroll = null) => {
    setSelectedPayroll(payroll);
    setModalType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPayroll(null);
    setModalType("");
  };

  const handleDelete = async (payroll) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This payroll record will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.post(`${BASE_URL}/payroll/delete_payroll.php`, {
            payroll_id: payroll.payroll_id,
          });

          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Payroll record deleted successfully.",
          }).then(() => {
            fetchPayrolls(); // Auto refresh after confirmation
          });
        } catch (error) {
          console.error("Error deleting record:", error);
          Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Failed to delete the payroll record.",
          });
        }
      }
    });
  };

  const handleSelectPayroll = (payrollId) => {
    setSelectedPayrolls((prev) =>
      prev.includes(payrollId)
        ? prev.filter((id) => id !== payrollId)
        : [...prev, payrollId],
    );
  };

  const handleSelectAll = () => {
    if (selectedPayrolls.length === payrollData.length) {
      setSelectedPayrolls([]);
    } else {
      setSelectedPayrolls(payrollData.map((payroll) => payroll.payroll_id));
    }
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "2-digit" };
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-US", options);

    // Replace the month abbreviation with the one that includes a dot
    return formattedDate.replace(
      /(\w{3})\s(\d{1,2}),\s(\d{4})/,
      (match, month, day, year) => {
        const monthWithDot = month + "."; // Append a dot to the month
        return `${monthWithDot} ${day}, ${year}`;
      },
    );
  };
  const closePayrollLog = () => {
    setShowPayrollLog(false); // Close the payroll log modal
  };
  const handlePrint = (payrolls) => {
    const printWindow = window.open("", "_blank");

    if (printWindow) {
      printWindow.document.write(`
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payslip</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @page {
            size: letter portrait;
            margin: 0.1in;
        }

        @media print {
            body {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                width: 100%;
                height: 100%;
                margin: auto;
                
            }
            .payslip {
                width: 4in;
                height: 3.5in;
                break-inside: avoid;
                margin: auto; /* Adjusted margin for better centering */
            }
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="grid grid-cols-2 gap-1 w-[8.5in] h-auto p-1 bg-white shadow-lg">
        <!-- Payslip Template -->
       `);

      payrolls.forEach((payroll) => {
        const sss = parseFloat(payroll.sss_employee_share) || 0;
        const philhealth = parseFloat(payroll.philhealth_employee_share) || 0;
        const pagibig = parseFloat(payroll.pagibig_employee_share) || 0;
        const totalDeduction = (sss + philhealth + pagibig).toFixed(2);

        const totalBasic = parseFloat(payroll.total_basic_salary) || 0;
        const netSalary = (totalBasic - parseFloat(totalDeduction)).toFixed(2);

        printWindow.document.write(`
            <div class="payslip justify-center border border-black p-1 text-xs">
                <div class="text-center mb-1">
                    <h1 class="text-sm font-bold">CENTRAL JUAN IT SOLUTION</h1>
                    <p>Address</p>
                </div>
                <h2 class="text-sm font-semibold text-center mb-1">PAYSLIP</h2>
                <div class="flex justify-between text-xs mb-1">
                    <div>
                        <p>Employee Name: ${payroll.name}</p>
                        <p>Designation: ${payroll.position_name}</p>
                    </div>
                    <div>
                        <p>Day From: ${new Date(payroll.date_from).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                        <p>Day Until: ${new Date(payroll.date_until).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                </div>
                <table class="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr>
                            <th class="border border-black p-1">Earnings</th>
                            <th class="border border-black p-1">Amount</th>
                            <th class="border border-black p-1">Deductions</th>
                            <th class="border border-black p-1">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="border border-black p-1">Basic Salary</td>
                            <td class="border border-black p-1">${payroll.basic_salary}</td>
                            <td class="border border-black p-1">SSS</td>
                            <td class="border border-black p-1">${payroll.sss_employee_share}</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1">Days</td>
                            <td class="border border-black p-1">${payroll.total_days}</td>
                            <td class="border border-black p-1">PHIL. HEALTH</td>
                            <td class="border border-black p-1">${payroll.philhealth_employee_share}</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1">Incentives</td>
                            <td class="border border-black p-1">-</td>
                            <td class="border border-black p-1">Pag-ibig</td>
                            <td class="border border-black p-1">${payroll.pagibig_employee_share}</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1">Retroactive</td>
                            <td class="border border-black p-1">-</td>
                            <td class="border border-black p-1">Others</td>
                            <td class="border border-black p-1">-</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1 font-bold">Gross Earning:</td>
                            <td class="border border-black p-1">${payroll.total_basic_salary}</td>
                            <td class="border border-black p-1">CA</td>
                            <td class="border border-black p-1">-</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1">Over Time</td>
                            <td class="border border-black p-1">${payroll.total_overtime_request}</td>
                            <td class="border border-black p-1 font-bold">Total Deduction:</td>
                            <td class="border border-black p-1">${totalDeduction}</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1"></td>
                            <td class="border border-black p-1"></td>
                            <td class="border border-black p-1 font-bold">Net Salary:</td>
                            <td class="border border-black p-1">${netSalary}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="flex justify-between text-xs">
                    <div class="text-center">
                        <p>Alan T. Ang or HR</p>
                        <p>Employer's Signature</p>
                    </div>
                    <div class="text-center text-[10px] font-bold copy-type">
                        <p>Employee Copy</p>
                    </div>
                    <div class="text-center">
                        <p>_________________________</p>
                        <p>Employee Signature</p>
                    </div>
                </div>
            </div>


            <div class="payslip justify-center border border-black p-1 text-xs">
                <div class="text-center mb-1">
                    <h1 class="text-sm font-bold">CENTRAL JUAN IT SOLUTION</h1>
                    <p>Address</p>
                </div>
                <h2 class="text-sm font-semibold text-center mb-1">PAYSLIP</h2>
                <div class="flex justify-between text-xs mb-1">
                    <div>
                        <p>Employee Name: ${payroll.name}</p>
                        <p>Designation: ${payroll.position_name}</p>
                    </div>
                    <div>
                        <p>Day From: ${new Date(payroll.date_from).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                        <p>Day Until: ${new Date(payroll.date_until).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

                    </div>
                </div>
                <table class="w-full border-collapse border border-black text-[10px]">
                    <thead>
                        <tr>
                            <th class="border border-black p-1">Earnings</th>
                            <th class="border border-black p-1">Amount</th>
                            <th class="border border-black p-1">Deductions</th>
                            <th class="border border-black p-1">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="border border-black p-1">Basic Salary</td>
                            <td class="border border-black p-1">${payroll.basic_salary}</td>
                            <td class="border border-black p-1">SSS</td>
                            <td class="border border-black p-1">${payroll.sss_employee_share}</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1">Days</td>
                            <td class="border border-black p-1">${payroll.total_days}</td>
                            <td class="border border-black p-1">PHIL. HEALTH</td>
                            <td class="border border-black p-1">${payroll.philhealth_employee_share}</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1">Incentives</td>
                            <td class="border border-black p-1">-</td>
                            <td class="border border-black p-1">Pag-ibig</td>
                            <td class="border border-black p-1">${payroll.pagibig_employee_share}</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1">Retroactive</td>
                            <td class="border border-black p-1">-</td>
                            <td class="border border-black p-1">Others</td>
                            <td class="border border-black p-1">-</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1 font-bold">Gross Earning:</td>
                            <td class="border border-black p-1">${payroll.total_basic_salary}</td>
                            <td class="border border-black p-1">CA</td>
                            <td class="border border-black p-1">-</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1">Over Time</td>
                            <td class="border border-black p-1">${payroll.total_overtime_request}</td>
                            <td class="border border-black p-1 font-bold">Total Deduction:</td>
                            <td class="border border-black p-1">${totalDeduction}</td>
                        </tr>
                        <tr>
                            <td class="border border-black p-1"></td>
                            <td class="border border-black p-1"></td>
                            <td class="border border-black p-1 font-bold">Net Salary:</td>
                            <td class="border border-black p-1">${netSalary}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="flex justify-between text-xs">
                    <div class="text-center">
                        <p>Alan T. Ang or HR</p>
                        <p>Employer's Signature</p>
                    </div>
                    <div class="text-center text-[10px] font-bold copy-type">
                        <p>Employer Copy</p>
                    </div>
                    <div class="text-center">
                        <p>_________________________</p>
                        <p>Employee Signature</p>
                    </div>
                </div>
            </div>
            `);
      });

      printWindow.document.write(`
        </div>
        <script>
            window.onload = function() {
                window.print();
                window.close();
            };
        </script>
    </body>
        `);

      printWindow.document.close();
      printWindow.focus();
    }
  };

  const breadcrumbItems = [
    // { label: 'Home', path: '/' },
    { label: "Payroll Dashboard", path: "/payrolldashboard" },
    { label: "Payroll Records" },
  ];

  return (
    <div className="container overflow-hidden">
      <div className="flex flex-col h-fit gap-y-4">
        <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
          <span className="text-2xl font-semibold">Payroll Records</span>
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <div className="flex flex-row justify-between w-full">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="h-10 p-2 pl-10 pr-3 bg-gray-200 rounded-lg shadow-inner lg:w-150 md:w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute transform -translate-y-1/2 left-3 top-1/2">
              <Search size={18} className="text-gray-600" />
            </div>
          </div>

          <div className="flex flex-row gap-x-5">
            <div className="flex flex-row gap-x-3 w-fit">
              {user?.role === "ADMIN" && (
                <Tooltip
                  title="Edit Date Range"
                  placement="bottom"
                  slotProps={{
                    popper: {
                      sx: {
                        [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
                          {
                            marginTop: "7px",
                            backgroundColor: "#46494c",
                          },
                      },
                    },
                  }}
                >
                  <button
                    // data-tooltip-id="Add-employee" data-tooltip-content='Add Employee'
                    className="items-center w-10 h-10 rounded-lg cursor-pointer hover:transition hover:duration-400 hover:ease-out hover:scale-95 place-items-center employee-newheaderbuttons-solid"
                    onClick={() => {
                      // Open the modal for editing the first payroll record as an example
                      if (payrollData.length > 0) {
                        openModal("edit", payrollData[0]); // Edit the first payroll for demonstration
                      }
                    }}
                  >
                    <CalendarCog size={25} fontWeight={20} />
                  </button>
                </Tooltip>
              )}

              <Tooltip
                title="Print Selected"
                placement="bottom"
                slotProps={{
                  popper: {
                    sx: {
                      [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
                        {
                          marginTop: "7px",
                          backgroundColor: "#46494c",
                        },
                    },
                  },
                }}
              >
                <button
                  className="items-center w-10 h-10 border rounded-lg cursor-pointer hover:transition hover:duration-400 hover:ease-out hover:scale-95 place-items-center employee-newheaderbuttons-outline"
                  onClick={() =>
                    handlePrint(
                      payrollData.filter((payroll) =>
                        selectedPayrolls.includes(payroll.payroll_id),
                      ),
                    )
                  }
                >
                  <Printer size={23} />
                  {/* <img src="/src/assets/printRB.png" className="w-10 h-10" alt="Print" /> */}
                  <Tooltip id="Sprint" />
                </button>
              </Tooltip>

              <Tooltip
                title="Logs"
                placement="bottom"
                slotProps={{
                  popper: {
                    sx: {
                      [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
                        {
                          marginTop: "7px",
                          backgroundColor: "#46494c",
                        },
                    },
                  },
                }}
              >
                <button
                  className="items-center w-10 h-10 border rounded-lg cursor-pointer hover:transition hover:duration-400 hover:ease-out hover:scale-95 place-items-center employee-newheaderbuttons-outline"
                  onClick={() => setShowPayrollLog(true)} // Show the payroll log modal
                >
                  <Logs size={23} />
                </button>
              </Tooltip>
            </div>

            <div className="w-[2px] my-1 rounded bg-black" />

            <div className="flex flex-row h-10 overflow-hidden border rounded-lg w-fit divide-x employee-newheaderbuttons-outline">
              <Tooltip
                title="List View"
                placement="bottom-end"
                slotProps={{
                  popper: {
                    sx: {
                      [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
                        {
                          marginTop: "7px",
                          backgroundColor: "#46494c",
                        },
                    },
                  },
                }}
              >
                <div
                  onClick={handleListView}
                  className={`w-10 content-center place-items-center cursor-pointer hover:bg-[#ACCCFC]/50
                                    ${activeView === "list" ? "employee-newheaderbuttons-solid" : ""}
                                    `}
                >
                  <AlignJustify size={23} />
                </div>
              </Tooltip>

              <Tooltip
                title="Grid View"
                placement="bottom-end"
                slotProps={{
                  popper: {
                    sx: {
                      [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
                        {
                          marginTop: "7px",
                          backgroundColor: "#46494c",
                        },
                    },
                  },
                }}
              >
                <div
                  onClick={handleGridView}
                  className={`w-10 content-center place-items-center cursor-pointer hover:bg-[#ACCCFC]/50
                                ${activeView === "grid" ? "employee-newheaderbuttons-solid" : ""}
                                `}
                >
                  <Grid3x3 size={23} />
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Payroll Log */}
      {showPayrollLog && (
        <div className="fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-black/30">
          {/* This is the backdrop area that listens for outside clicks */}
          <div
            ref={modalRef}
            className="p-6 bg-white rounded-lg shadow-lg max-w-[600px] w-full"
          >
            <PayrollLog closeLog={closePayrollLog} />
          </div>
        </div>
      )}

      {showGridView && (
        <div className="flex gap-x-2 rounded-[15px] mt-4 overflow-y-hidden">
          <div
            className={`payroll-employee-sidelist overflow-y-scroll rounded-[15px]`}
          >
            {filteredPayrollData.map((payroll) => (
              <div
                key={payroll.payroll_id}
                className="relative flex flex-col p-4 bg-gray-200 payroll_employees_info"
              >
                <div>
                  <button
                    onClick={() => toggleActionsDropdown(payroll.payroll_id)}
                    className="absolute top-2 right-3"
                  >
                    <EllipsisHorizontalIcon className="text-gray-600 h-9 w-9" />
                  </button>

                  {openDropdownId === payroll.payroll_id && (
                    <div className="absolute p-2 bg-white rounded-lg shadow-lg right-4 top-10 w-35 h-fit place-content-end z-1">
                      <div className="flex flex-col gap-0.5">
                        <button
                          className="flex flex-row items-center gap-2 px-2 py-1 text-left text-blue-700 rounded-lg text_actions hover:bg-blue-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal("edit", payroll);
                            setOpenDropdownId(null);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          className="flex flex-row items-center gap-2 px-2 py-1 text-left text-red-700 rounded-lg text_actions hover:bg-red-100"
                          onClick={() => handleDelete(payroll)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div onClick={() => toggleDetailsDropdown(payroll)}>
                    <div className="flex flex-col cursor-pointer">
                      <span className="font-semibold text-md w-75 lg:text-lg">
                        {payroll.name}
                        <div className="h-[2px] w-full max-w-70 rounded-lg my-1 bg-gray-400" />
                      </span>
                      <div className="flex flex-col">
                        <p className="font-light text-md">
                          Department: {payroll.department_name}
                        </p>
                        <p className="font-light text-md">
                          Position: {payroll.position_name}
                        </p>
                      </div>
                    </div>

                    {openDropdownDetails === payroll.payroll_id && (
                      <div className="mt-4 p-3 bg-white rounded-[10px]">
                        <p className="text-lg font-semibold">
                          More Information
                        </p>
                        <div className="grid grid-cols-2 mt-2 place-content-between">
                          <strong>Employee ID:</strong> {payroll.employee_id}
                          <strong>Payroll ID:</strong> {payroll.payroll_id}
                          <p>
                            <strong>Date From:</strong>{" "}
                          </p>{" "}
                          {new Date(payroll.date_from).toLocaleDateString()}
                          <p>
                            <strong>Date Until:</strong>{" "}
                          </p>{" "}
                          {new Date(payroll.date_until).toLocaleDateString()}
                          <p>
                            <strong>Total Days:</strong>{" "}
                          </p>{" "}
                          {payroll.total_days}
                          <p>
                            <strong>Total Salary:</strong>{" "}
                          </p>{" "}
                          {payroll.total_basic_salary}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-full flex flex-col grow-10 gap bg-gray-200  rounded-[15px] p-10 md:p-5">
            <div className="h-fit bg-amber-200">
              {selectedPayroll && (
                <div className="flex flex-col w-full bg-red-50">
                  <h3 className="font-bold">Selected Payroll Details:</h3>
                  <p>
                    <strong>Total Days:</strong> {selectedPayroll.total_days}
                  </p>
                  <p>
                    <strong>Total Salary:</strong>{" "}
                    {selectedPayroll.total_basic_salary}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showListView && (
        <div className="mt-4 Glb-table">
          {!loading && payrollData.length > 0 && (
            <div className="Glb-table">
              <div className="px-2 Glb-group-1 Glc-tableheader Glc-tableheader-text payroll-grp1">
                <div className="flex justify-center w-40">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      selectedPayrolls.length === payrollData.length &&
                      payrollData.length > 0
                    }
                  />
                </div>
                <div className="Glb-table-headeroverflow payroll-tableheader">
                  EMPLOYEE DETAILS
                </div>
                <div className="Glb-table-headeroverflow payroll-tableheader">
                  POSITION
                </div>
                <div className="Glb-table-headeroverflow payroll-tableheader">
                  DAYS
                </div>
                <div className="Glb-table-headeroverflow payroll-tableheader">
                  DEDUCTION
                </div>
                <div className="Glb-table-headeroverflow payroll-tableheader">
                  TOTAL
                </div>
              </div>

              {filteredPayrollData.map((payroll, index) => (
                <div
                  key={payroll.payroll_id}
                  className={`Glb-group-2 payroll-grp2 px-2 hover:bg-gray-400 
                                ${index % 2 === 0 ? "Glc-table-background-color2" : "Glc-table-background"}
                                ${index % 1 === 0 ? "Glc-table-bordertop" : ""}
                            `}
                >
                  <div className="flex justify-center w-40">
                    <input
                      type="checkbox"
                      checked={selectedPayrolls.includes(payroll.payroll_id)}
                      onChange={() => handleSelectPayroll(payroll.payroll_id)}
                      className="rounded"
                    />
                  </div>
                  <div className="Glb-table-contentoverflow">
                    <div className="Glb-table-contentoverflow_contentscroll">
                      <div className="P-Employee-name payroll-content-textelipis w-full text-left text-[16px] border-b font-bold mb-1">
                        {payroll.name}
                      </div>
                      <div className="P-Employee-ID w-full text-left text-[13px] flex">
                        Employee ID:{" "}
                        <strong className="font-bold text-[13px] w-full flex justify-end">
                          {payroll.employee_id}
                        </strong>
                      </div>
                      <div className="P-Payroll-ID w-full text-left text-[13px] flex">
                        Payroll ID:{" "}
                        <strong className="font-bold text-[13px] w-full flex justify-end">
                          {payroll.payroll_id}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="Glb-table-contentoverflow">
                    <div className="Glb-table-contentoverflow_contentscroll">
                      <div className="text-[13px] gap-x-10 w-full flex flex-row justify-between items-start">
                        <div>Post. ID:</div>
                        <strong className="payroll-content-textelipis font-bold text-[15px] ">
                          {payroll.position_name}
                        </strong>
                      </div>
                      <div className="text-[13px] gap-x-10 w-full flex flex-row justify-between items-start">
                        <div>Dept. ID:</div>
                        <strong className="payroll-content-textelipis font-bold text-[15px]">
                          {payroll.department_name}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="Glb-table-contentoverflow">
                    <div className="flex flex-col items-center justify-center Glb-table-contentoverflow_contentscroll">
                      <div className="From-to-date border-b flex flex-row gap-x-1 mb-1  w-full justify-between">
                        <strong>{formatDate(payroll.date_from)}</strong>
                        {/* <span> TO </span> */}
                        {/* <MoveHorizontal /> */}
                        <div className="flex items-center w-full ">
                          {/* <ChevronLeft/> */}
                          <div className="w-full bg-gray-700 h-[2px]" />
                          {/* <ChevronRight/> */}
                        </div>
                        <strong>{formatDate(payroll.date_until)}</strong>
                      </div>
                      <div className="w-full Glb-table-contentoverflow_contentscroll">
                        <div className="P-Phil-deduction text-[13px] gap-x-2 w-full flex flex-row justify-between items-end">
                          <div className="">Total Days:</div>
                          <strong className="font-bold text-[14px]">
                            {payroll.total_days}
                          </strong>
                        </div>
                        <div className="P-SSS-Deduction text-[13px] gap-x-2 w-full flex flex-row justify-between items-end">
                          <div className="">Total Overtime:</div>
                          {/* <strong className='font-bold text-[14px]'>{payroll.total_overtime_hours}</strong> */}
                          <strong className="font-bold text-[14px]">
                            {payroll.total_overtime_request}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="Glb-table-contentoverflow">
                    <div className="Glb-table-contentoverflow_contentscroll">
                      <div className="P-Phil-deduction text-[13px] gap-x-2 w-full flex flex-row justify-between items-end">
                        <div className="">Phil. Health:</div>
                        <strong className="font-bold text-[14px]">
                          {payroll.philhealth_employee_share}
                        </strong>
                      </div>
                      <div className="P-SSS-Deduction text-[13px] gap-x-2 w-full flex flex-row justify-between items-end">
                        <div className="">SSS:</div>
                        <strong className="font-bold text-[14px]">
                          {payroll.sss_employee_share}
                        </strong>
                      </div>
                      <div className="P-PagIbig-Deduction text-[13px] gap-x-2 w-full flex flex-row justify-between items-end">
                        <div className="">Pag-ibig:</div>
                        <strong className="font-bold text-[14px]">
                          {payroll.pagibig_employee_share}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="Glb-table-contentoverflow">
                    <div className="Glb-table-contentoverflow_contentscroll">
                      <div className="flex justify-between w-full P-Total-Salary gap-x-2">
                        <div className="">Total Salary:</div>
                        <strong className="font-bold text-[15px] flex items-end">
                          {" "}
                          {payroll.total_basic_salary}
                        </strong>
                      </div>
                      <div className="P-Total-Deduction text-[13px] gap-x-2 w-full flex flex-row justify-between items-end font-bold">
                        <div className="">Total Deduction:</div>
                        <strong className="text-[14px]">
                          {(
                            (parseFloat(payroll.philhealth_employee_share) ||
                              0) +
                            (parseFloat(payroll.sss_employee_share) || 0) +
                            (parseFloat(payroll.pagibig_employee_share) || 0)
                          ).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                  {/* {user?.role === "ADMIN" && 
                                    <div className='payroll-table-content flex-[.75]'>
                                        <div className="flex flex-row">
                                        <button className="btn-edit btn-logo-Size-Position" onClick={() => openModal('edit', payroll)}>
                                            <img src="src/assets/editBTN.png" alt="btn-edit" className='btn-imagesize' />
                                        </button>
                                        <button
                                            className="btn-delete btn-logo-Size-Position"
                                            onClick={() => handleDelete(payroll)}
                                        >
                                            <img src="src/assets/deleteBTN.png" alt="delete-logo" className="btn-imagesize" />
                                        </button>
                                    </div>
                                </div>
                            } */}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <PayrollModal
          modalType={modalType}
          payroll={selectedPayroll}
          closeModal={closeModal}
          refreshData={fetchPayrolls}
        />
      )}
    </div>
  );
};

export default Payroll;
