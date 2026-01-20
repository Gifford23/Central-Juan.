import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from "framer-motion";

const PositionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  position, 
  departmentId, 
  departmentName,       // ✅ still available for display
  existingPositions = [] // ✅ list of positions under this dept
}) => {
  const [positionId, setPositionId] = useState('');
  const [positionName, setPositionName] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (position) {
        // Editing → keep values
        setPositionId(position.position_id);
        setPositionName(position.position_name);
      } else {
        // Adding → auto-generate new ID
        const existingNums = existingPositions
          .map((p) => {
            const match = p.position_id.match(/-P(\d+)$/); // find number at end
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => n > 0);

        const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
        setPositionId(`${departmentId}-P${nextNum}`);
        setPositionName('');
      }
    }
  }, [isOpen, position, departmentId, existingPositions]);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!positionName.trim()) {
      alert('Position Name is required.');
      return;
    }

    if (!departmentId) {
      alert('Department ID is required.');
      return;
    }

    const newPosition = {
      position_id: position ? position.position_id : positionId, // keep old ID if editing
      position_name: positionName.trim(),
      department_id: departmentId,
    };

    onSubmit(newPosition);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <motion.div
          className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-md"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold mb-4">
            {position ? "Edit Position" : "Add New Position"}
          </h2>
          <form className="flex flex-col" onSubmit={handleSubmit}>
            
            <label className="block mb-2">Position ID:asdasd</label>
            <input
              type="text"
              value={positionId}
              readOnly
              className="border border-gray-300 rounded p-2 w-full bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mb-4">Auto-generated</p>

            <label className="block mb-2">Position Name:</label>
            <input
              type="text"
              value={positionName}
              onChange={(e) => setPositionName(e.target.value)}
              placeholder="Enter position name"
              required
              className="border border-gray-300 rounded p-2 w-full mb-4"
            />

            <div className="mt-4 flex gap-4">
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600 transition"
              >
                {position ? "Update" : "Add"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-red-500 text-white px-4 py-2 rounded w-full hover:bg-red-600 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

PositionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  position: PropTypes.object,
  departmentId: PropTypes.string.isRequired,
  departmentName: PropTypes.string,
  existingPositions: PropTypes.array,
};

export default PositionModal;
