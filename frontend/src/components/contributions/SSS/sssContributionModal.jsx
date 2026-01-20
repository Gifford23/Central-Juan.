import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import BASE_URL from '../../../../backend/server/config'; 

const SSSContributionModal = ({ isOpen, onClose, selectedRecord, fetchContributions }) => {
  const [sssNumber, setSSSNumber] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedRecord) {
      setSSSNumber(selectedRecord.sss_number || "");
    }
  }, [selectedRecord]);

  const handleSave = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/contributions/sss/update_sss_contribution.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedRecord.SSS_Contribution_id, // Ensure correct column name
            sss_number: sssNumber,
          }),
        }
      );

      const text = await response.text();
      console.log(text);

      const result = JSON.parse(text);

      if (result.success) {
        Swal.fire({
          title: "Success!",
          text: "SSS Number updated successfully",
          icon: "success",
          confirmButtonText: "OK",
        }).then(() => {
          fetchContributions(); // Fetch updated data
          onClose(); // Close modal
        });
      } else {
        setError(`Error: ${result.message} - ${result.error || "Unknown error"}`);
        Swal.fire({
          title: "Error!",
          text: result.message || "An unknown error occurred.",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Failed to update SSS Number. Please check your network.");
      Swal.fire({
        title: "Error!",
        text: "Failed to update SSS Number. Please check your network.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  
  
  
  

  if (!isOpen) return null;

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
        className="bg-white flex px-4 flex-col w-[30vh] h-[25vh] justify-center items-center rounded-[15px] shadow-lg"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        <h2 className="text-2xl font-semibold mb-4">Update</h2>
        <div className="p-4">
          <label className="block text-gray-700">SSS Number</label>
          <input
            className="border w-full rounded-[5px] px-2 py-1"
            type="text"
            value={sssNumber}
            maxLength={10} // Restricts input to 10 characters
            onChange={(e) => setSSSNumber(e.target.value)}
            required
          />
        </div>
        <div className="w-full flex flex-row justify-evenly p-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition duration-300"
            onClick={handleSave}
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

      {/* <div className="modal-content">
        <h2>Edit SSS Number</h2>
        {error && <p className="error">{error}</p>}
        <label>
          SSS Number:
          <input
            type="text"
            value={sssNumber}
            maxLength={10}  // Add this line
            onChange={(e) => setSSSNumber(e.target.value)}
            />
        </label>
        <button onClick={handleSave}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div> */}
</AnimatePresence>
  );
};
SSSContributionModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    selectedRecord: PropTypes.shape({
      sss_number: PropTypes.string,
      SSS_Contribution_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // Accept both number and string
    }),
    fetchContributions: PropTypes.func.isRequired,
  };
  
  
export default SSSContributionModal;
