import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import BASE_URL from '../../../backend/server/config'; // Ensure this path is correct

const DeductionModal = ({ isOpen, onRequestClose, selectedRecord, fetchContributions }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [deduction, setDeduction] = useState('');

  useEffect(() => {
    if (selectedRecord) {
      setStartTime(selectedRecord.start_time);
      setEndTime(selectedRecord.end_time);
      setDeduction(selectedRecord.deduction);
    } else {
      setStartTime('');
      setEndTime('');
      setDeduction('');
    }
  }, [selectedRecord]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const method = selectedRecord ? 'PUT' : 'POST';
    const url = selectedRecord
      ? `${BASE_URL}/deduction/edit_deduction.php`
      : `${BASE_URL}/deduction/add_deduction.php`;

    const formatTimeForSubmission = (time) => {
      const [timePart, modifier] = time.split(' ');
      const [hours, minutes] = timePart.split(':');
      const hoursIn24 = modifier === 'PM' && hours !== '12' ? parseInt(hours) + 12 : hours;
      return `${hoursIn24}:${minutes}`;
    };

    const body = {
      id: selectedRecord ? selectedRecord.id : undefined,
      start_time: formatTimeForSubmission(startTime),
      end_time: formatTimeForSubmission(endTime),
      deduction: parseFloat(deduction),
    };

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: selectedRecord ? 'Deduction Updated' : 'Deduction Added',
            text: 'The deduction has been successfully saved!',
            confirmButtonText: "OK"
          }).then(() => {
            onRequestClose(); // Close the modal first
            setTimeout(() => {
              fetchContributions(); // Fetch new data after closing
            }, 500);
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Failed',
          text: 'Failed to save deduction',
        });
      });
  };

  return (
    isOpen && (
      <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <AnimatePresence>
          <motion.div
            className="modal-content bg-white rounded-lg p-6 shadow-lg w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-3xl font-bold mb-6 text-blue-600">
              {selectedRecord ? "Edit Deduction" : "Add Deduction"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-gray-700 font-medium">Start Time:</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="font-mono border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium">End Time:</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="font-mono border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium">Deduction:</label>
                <input
                  type="number"
                  value={deduction}
                  onChange={(e) => setDeduction(e.target.value)}
                  required
                  step="0.01"
                  className="font-mono border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex justify-end gap-4 mt-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition duration-300"
                >
                  {selectedRecord ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={onRequestClose}
                  className="bg-gray-400 hover:bg-gray-500 text-white py-2 px-6 rounded-lg transition duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  );
};

DeductionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onRequestClose: PropTypes.func.isRequired,
  selectedRecord: PropTypes.shape({
    id: PropTypes.number,
    start_time: PropTypes.string,
    end_time: PropTypes.string,
    deduction: PropTypes.number,
  }),
  fetchContributions: PropTypes.func.isRequired,
};

export default DeductionModal;
