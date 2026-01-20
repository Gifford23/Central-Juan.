import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from 'prop-types'; // Import PropTypes
import { motion, AnimatePresence } from "framer-motion";
import BASE_URL from '../../../../backend/server/config'; 

const PhilhealthContributionModal = ({ isOpen, onClose, selectedRecord, refreshData }) => {
  const [phId, setPhId] = useState("");

  useEffect(() => {
    if (selectedRecord) {
      setPhId(selectedRecord.ph_id || ""); // Set the current PH ID when the modal opens
    }
  }, [selectedRecord]);

  const handleUpdate = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/contributions/philhealth/update_philhealth_contribution.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedRecord.PH_contribution_id, // Use the correct ID
            ph_id: phId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "PH ID updated successfully.",
        });
        refreshData(); // Refresh the data after successful update
        onClose(); // Close the modal
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops!",
          text: result.message || "Failed to update PH ID.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Error updating PH ID: " + error.message,
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
        className="bg-white px-4 flex flex-col w-[30vh] h-[25vh] justify-center items-center rounded-[15px] shadow-lg"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-2xl font-semibold mb-4 ">Update</h2>
        <div className="p-4">
          <label className="block text-gray-700">Phil. Health ID</label>
          <input
            className="border w-full rounded-[5px] px-2 py-1"
            type="text"
            value={phId}
            maxLength={10} // Restricts to 10 characters
            onChange={(e) => setPhId(e.target.value)}
            required
          />
        </div>
        <div className="w-full flex flex-row justify-evenly p-4">
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
PhilhealthContributionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedRecord: PropTypes.shape({
    PH_contribution_id: PropTypes.number.isRequired,
    ph_id: PropTypes.string.isRequired,
    // Add other fields if necessary
  }),
  refreshData: PropTypes.func.isRequired,
};

export default PhilhealthContributionModal;