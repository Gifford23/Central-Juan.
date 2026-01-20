import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from 'prop-types'; // Import PropTypes
import { motion, AnimatePresence } from "framer-motion";
import BASE_URL from '../../../../backend/server/config'; 

const PagibigContributionModal = ({ isOpen, onClose, selectedRecord, refreshData }) => {
  const [pagibigID, setPagibigID] = useState("");

  useEffect(() => {
    if (selectedRecord) {
      setPagibigID(selectedRecord.pagibig_ID || ""); // Set the current PAG-IBIG ID when the modal opens
    }
  }, [selectedRecord]);

  const handleUpdate = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/contributions/pagibig/update_pagibig_contribution.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedRecord.pagibig_contribution_id, // Use the correct ID
            pagibig_ID: pagibigID,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "PAG-IBIG ID updated successfully.",
        });
        refreshData(); // Refresh the data after successful update
        onClose(); // Close the modal
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops!",
          text: result.message || "Failed to update PAG-IBIG ID.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Error updating PAG-IBIG ID: " + error.message,
      });
    }
  };

  if (!isOpen) return null; // Don't render if the modal is not open

  return (
<AnimatePresence>
  {isOpen && (
    <motion.div
      className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      aria-hidden="true"
    >
      <motion.div
        className="bg-white flex flex-col px-4 w-[30vh] h-[25vh] justify-center items-center rounded-[15px]"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-2xl font-semibold mb-4 ">Update</h2>
        <div className="p-4">
          <label className="block text-gray-700">PAG-IBIG ID</label>
          <input
            className="border w-full rounded-[5px] px-2 py-1"
            type="text"
            value={pagibigID}
            onChange={(e) => setPagibigID(e.target.value)}
            required
          />
        </div>
        <div className="w-full flex flex-row justify-evenly pt-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition duration-300"
            onClick={handleUpdate}
          >
            Update
          </button>
          <button
            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
            onClick={onClose}
          >
            Cancel
          </button>


        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};

// Define prop types
PagibigContributionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedRecord: PropTypes.shape({
    pagibig_contribution_id: PropTypes.number.isRequired,
    pagibig_ID: PropTypes.string.isRequired,
  }),
  refreshData: PropTypes.func.isRequired,
};

export default PagibigContributionModal;