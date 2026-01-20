import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';

const SalaryGradeModal = ({ grade = null, onClose, onSave }) => {
    const [updatedGrade, setUpdatedGrade] = useState(grade || {});

    useEffect(() => {
        if (grade) {
            setUpdatedGrade(grade);
        } else {
            // Reset for new grade
            setUpdatedGrade({
                GradeID: '',
                PositionLevel: '',
                Step1: '',
                Step2: '',
                Step3: '',
            });
        }
    }, [grade]);

    const handleSave = () => {
        const payload = {
            grade_id: updatedGrade.GradeID,
            position_level: updatedGrade.PositionLevel,
            step1: updatedGrade.Step1,
            step2: updatedGrade.Step2,
            step3: updatedGrade.Step3,
        };
        onSave(payload); // Save the updated grade
    };

    const handleChange = (e, field) => {
        const value = field.includes('Step') ? parseFloat(e.target.value) : e.target.value;
        setUpdatedGrade({
            ...updatedGrade,
            [field]: value,
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-hidden="true"
            >
                <motion.div
                    className="modal-content bg-white rounded-lg p-6 w-full max-w-md shadow-lg"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                >
                    <h2 className="text-2xl font-semibold mb-4">{grade ? 'Edit Salary Grade' : 'Add Salary Grade'}</h2>
                    <form className="space-y-4">
                        <div>
                            <label className="block text-gray-700">Grade ID</label>
                            <input
                            type="text"
                            value={updatedGrade.GradeID || ''}
                            onChange={(e) => handleChange(e, 'GradeID')}
                            placeholder="Enter Grade ID"
                            className={`font-mono w-full p-2 border border-gray-300 rounded-md focus:outline-none ${
                                grade ? 'bg-gray-200 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'
                            }`}
                            required
                            readOnly={!!grade}
                        />

                        </div>
                        <div>
                            <label className="block text-gray-700">Position Level</label>
                            <input
                                type="text"
                                value={updatedGrade.PositionLevel || ''}
                                onChange={(e) => handleChange(e, 'PositionLevel')}
                                className="font-mono w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700">Step 1</label>
                            <input
                                type="number"
                                value={updatedGrade.Step1 || ''}
                                onChange={(e) => handleChange(e, 'Step1')}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700">Step 2</label>
                            <input
                                type="number"
                                value={updatedGrade.Step2 || ''}
                                onChange={(e) => handleChange(e, 'Step2')}
                                className="font-mono w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700">Step 3</label>
                            <input
                                type="number"
                                value={updatedGrade.Step3 || ''}
                                onChange={(e) => handleChange(e, 'Step3')}
                                className="font-mono w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={handleSave}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// PropTypes validation
SalaryGradeModal.propTypes = {
    grade: PropTypes.shape({
        GradeID: PropTypes.string,
        PositionLevel: PropTypes.string,
        Step1: PropTypes.number,
        Step2: PropTypes.number,
        Step3: PropTypes.number,
    }),
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
};

export default SalaryGradeModal;
