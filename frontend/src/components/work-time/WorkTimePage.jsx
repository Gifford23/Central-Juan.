// src/pages/work-time-page.jsx
import React, { useState } from "react";
import WorkTimeTable from "./work-time-componets/WorkTimeTable";
import WorkTimeFormModal from "./work-time-componets/WorkTimeformModal";
import WorkTimeDetails from "./work-time-componets/WorkTimeDetails";

const WorkTimePage = () => {
  const [selectedShift, setSelectedShift] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(null);
  const [reloadFlag, setReloadFlag] = useState(false);

  const handleView = (shift) => {
    setSelectedShift(shift);
  };

  const handleEdit = (shift) => {
    setFormData(shift);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setFormData(null);
    setIsFormOpen(true);
  };

  const handleSaved = () => {
    setReloadFlag(!reloadFlag); // flip flag to refresh WorkTimeTable
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">⏰ Work Time Management</h1>
        <button
          onClick={handleAdd}
          className="px-4 py-2 text-white bg-green-600 rounded-lg"
        >
          ➕ Add Shift
        </button>
      </div>

      {/* Work Time List */}
      <WorkTimeTable
        onEdit={handleEdit}
        onView={handleView}
        reloadFlag={reloadFlag}
      />

      {/* Form Modal */}
      <WorkTimeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={formData}
        onSaved={handleSaved}
      />

      {/* Details Modal */}
      <WorkTimeDetails
        shift={selectedShift}
        onClose={() => setSelectedShift(null)}
      />
    </div>
  );
};

export default WorkTimePage;
