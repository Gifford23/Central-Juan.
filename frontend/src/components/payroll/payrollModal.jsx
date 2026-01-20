import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import axios from "axios";
import Swal from "sweetalert2";
import BASE_URL from '../../../backend/server/config';

const PayrollModal = ({ modalType, payroll, closeModal, refreshData }) => {
    const [formData, setFormData] = useState({
        employee_id: '',
        date_from: '',
        date_until: '',
        total_days: '',
        total_salary: '',
        payroll_id: ''
    });
    
    const [dateRange, setDateRange] = useState([
        {
            startDate: new Date(),
            endDate: new Date(),
            key: "selection"
        }
    ]);

    const checkExistingPayrollDates = async (dateFrom, dateUntil) => {
        try {
            const response = await axios.get(`${BASE_URL}/payroll/check_existing_dates.php`, {
                params: { date_from: dateFrom, date_until: dateUntil }
            });
            return response.data;
        } catch (error) {
            console.error('Error checking existing payroll dates:', error);
            return { exists: false, overlapping_dates: [] };
        }
    };
    
    useEffect(() => {
        if (modalType === 'edit' && payroll) {
            setFormData({
                employee_id: payroll.employee_id || '',
                date_from: payroll.date_from || '',
                date_until: payroll.date_until || '',
                total_days: payroll.total_days || '',
                total_salary: payroll.total_salary || '',
                payroll_id: payroll.payroll_id || ''
            });

            if (payroll.date_from && payroll.date_until) {
                const startDate = new Date(`${payroll.date_from}T00:00:00Z`);
                const endDate = new Date(`${payroll.date_until}T00:00:00Z`);
                setDateRange([{ startDate, endDate, key: "selection" }]);
            }
        }
    }, [modalType, payroll]);

    const formatDate = (date) => {
        return date.getFullYear() + '-' +
               String(date.getMonth() + 1).padStart(2, '0') + '-' +
               String(date.getDate()).padStart(2, '0');
    };
    
    const handleDateChange = (ranges) => {
        const { startDate, endDate } = ranges.selection;
        setDateRange([{ startDate, endDate, key: "selection" }]);
        setFormData((prevState) => ({
            ...prevState,
            date_from: formatDate(startDate),
            date_until: formatDate(endDate)
        }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();

           console.log("📌 Submitting payroll formData:", formData);


        if (!formData.date_from || !formData.date_until) {
            Swal.fire({
                icon: "warning",
                title: "Missing Fields",
                text: "Date fields cannot be empty."
            });
            return;
        }

        // Check if the selected dates already exist
        const { exists, overlapping_dates } = await checkExistingPayrollDates(formData.date_from, formData.date_until);
if (exists) {
    const datesList = Array.isArray(overlapping_dates)
        ? overlapping_dates.join(', ')
        : overlapping_dates || "unknown dates";

    const result = await Swal.fire({
        title: "Dates Already Exist",
        html: `The selected dates (${datesList}) are already used in a previous payroll. <br><strong>Do you want to continue?</strong><br><br><strong>Please check the Payroll Log</strong>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, continue",
        cancelButtonText: "No, cancel"
    });

    if (!result.isConfirmed) {
        return;
    }
}


        try {
            let response;
            let successMessage = "";

            if (modalType === 'add') {
                response = await axios.post(`${BASE_URL}/payroll/add_payroll.php`, formData);
                successMessage = "Payroll record added successfully!";
            } else if (modalType === 'edit') {
                response = await axios.put(`${BASE_URL}/payroll/update_payroll_dates.php`, formData);
                successMessage = "Payroll record updated successfully!";
            }
            console.log("📌 Server Response:", response.data); // ✅ log API response

            if (response.data.success) {
                Swal.fire({
                    icon: "success",
                    title: "Success!",
                    text: successMessage
                }).then(() => {
                    refreshData();
                    closeModal();
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error!",
                    text: response.data.message || "An error occurred while processing the request."
                });
            }
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Submission Error",
                text: "Error submitting form: " + error.message
            });
            console.error('Error submitting form:', error);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 modal-overlay">
            <AnimatePresence>
                <motion.div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg " initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()}>
                    <h2 className="mb-6 text-3xl font-bold text-blue-600">
                        {modalType === "edit" ? "Edit Dates" : "Add Payroll"}
                    </h2>
                    <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center w-full grid-cols-1 gap-4">
                        <DateRange
                            editableDateInputs={true}
                            onChange={handleDateChange}
                            moveRangeOnFirstSelection={false}
                            ranges={dateRange}
                            className="flex justify-center"
                        />
                        <div className="flex justify-end gap-4 mt-4">
                            <button type="submit" className="px-6 py-2 text-white transition duration-300 bg-blue-600 rounded-lg hover:bg-blue-700">
                                Save
                            </button>
                            <button type="button" onClick={closeModal} className="px-6 py-2 text-white transition duration-300 bg-gray-400 rounded-lg hover:bg-gray-500">
                                Cancel
                            </button>
                        </div>
                    </form>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

PayrollModal.propTypes = {
    modalType: PropTypes.string.isRequired,
    payroll: PropTypes.object,
    closeModal: PropTypes.func.isRequired,
    refreshData: PropTypes.func.isRequired
};

export default PayrollModal;
