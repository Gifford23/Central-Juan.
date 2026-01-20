import React, { useState } from 'react';
import useHolidays from '../holiday_listHOOKS/useHolidayHooks';
import HolidayTable from '../holiday_ListComponets/holiday_listTable';
import HolidayForm from '../holiday_ListComponets/holiday_listForm';

export default function HolidayPage() {
  const { holidays, loading, error, addHoliday, editHoliday, removeHoliday } = useHolidays();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const handleAddClick = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleFormSubmit = async (holiday) => {
    try {
      if (editing) {
        await editHoliday(holiday);
      } else {
        await addHoliday(holiday);
      }
      setShowForm(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (holiday) => {
    setEditing(holiday);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await removeHoliday(id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading) return <p>Loading holidays...</p>;


  return (
    <div className="max-w-4xl p-4 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">Holiday List</h1>
      
      <button onClick={handleAddClick} className="px-4 py-2 mb-4 text-white bg-green-600 rounded">
        Add Holiday
      </button>

      {showForm && (
        <HolidayForm
          initialData={editing}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
      
      <HolidayTable holidays={holidays} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}