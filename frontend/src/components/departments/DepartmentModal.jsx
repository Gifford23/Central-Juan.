  import { useState, useEffect } from 'react';
  import PropTypes from 'prop-types';
  import { motion, AnimatePresence } from "framer-motion";

  function DepartmentModal({ isOpen, onClose, onSubmit , department, existingDepartmentIds }) {
    const [departmentName, setDepartmentName] = useState('');
    const [departmentId, setDepartmentId] = useState('');

    useEffect(() => {
      if (department) {
        setDepartmentName(department.department_name || '');
        setDepartmentId(department.department_id || '');
      } else {
        // Generate the next department ID if adding a new department
        const nextId = generateNextDepartmentId(existingDepartmentIds);
        setDepartmentName('');
        setDepartmentId(nextId);
      }
    }, [department, existingDepartmentIds]);

    const generateNextDepartmentId = (existingIds) => {
      const prefix = 'DEP-';
      const idNumbers = existingIds
        .filter(id => id.startsWith(prefix))
        .map(id => parseInt(id.replace(prefix, '')))
        .sort((a, b) => a - b);

      const nextIdNumber = idNumbers.length > 0 ? Math.max(...idNumbers) + 1 : 1;
      return `${prefix}${String(nextIdNumber).padStart(3, '0')}`;
    };

    const handleSubmit = (e) => {
      // e.preventDefault();
        e.preventDefault();   // ✅ Stop form reload
    e.stopPropagation();  // ✅ Extra guard
      console.log("Submitting department:", {
      department_id: departmentId,
      department_name: departmentName,
    });
    
      if (!departmentName.trim() || !departmentId.trim()) {
        alert('Please provide both a department name and a valid ID.');
        return;
      }
    
      onSubmit({
        department_id: departmentId,
        department_name: departmentName,
      });
    
      onClose(); // Close the modal after submission
    };

    if (!isOpen) return null;

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          >
            <motion.div
              className="p-6 bg-white rounded-lg shadow-lg modal-content"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
            >
              <h2 className="mb-4 text-2xl font-semibold">{department ? 'Edit Department' : 'Add Department'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700">Department ID</label>
                  <input
                    type="text"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)} // This will not be used when editing
                    placeholder="Enter Department ID"
                    className={`font-mono w-full px-3 py-2 border rounded-md focus:outline-none ${
                      department ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-300 cursor-not-allowed'
                    }`}
                    required
                    readOnly={!!department} // Make it read-only if editing
                    // disabled={!department} // Disable if adding a new department
                  />
                </div>
                <div>
                  <label className="block text-gray-700">Department Name</label>
                  <input
                    type="text"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="Enter Department Name"
                    className="w-full px-3 py-2 font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end w-full gap-4">
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 "
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700 "
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  DepartmentModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    department: PropTypes.object,
    existingDepartmentIds: PropTypes.array.isRequired, // New prop for existing IDs
  };

  export default DepartmentModal;