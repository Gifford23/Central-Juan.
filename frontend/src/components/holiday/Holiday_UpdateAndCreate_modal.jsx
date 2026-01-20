import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react"; // or use your preferred spinner

const HolidayModal = ({ isOpen, onClose, onSave, defaultValues }) => {
  const [form, setForm] = useState({
    name: '',
    holiday_date: '',
    is_recurring: false,
    apply_multiplier: true,
    default_multiplier: '1.00',
    ot_multiplier: '1.00',
    extended_until: '',
    holiday_type: 'Regular',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultValues) setForm(defaultValues);
  }, [defaultValues]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(form);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center transition backdrop-blur-sm bg-black/40">
      <div className="w-full max-w-2xl p-6 bg-white shadow-lg rounded-xl">
        <h2 className="mb-6 text-xl font-bold text-gray-800">
          {defaultValues ? 'Edit Holiday' : 'Add Holiday'}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Holiday Name</label>
            <input
              name="name"
              required
              placeholder="e.g. Independence Day"
              value={form.name}
              onChange={handleChange}
              className="p-2 border rounded-md focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Holiday Date</label>
            <input
              type="date"
              name="holiday_date"
              required
              value={form.holiday_date}
              onChange={handleChange}
              className="p-2 border rounded-md focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Holiday Type</label>
            <select
              name="holiday_type"
              value={form.holiday_type}
              onChange={handleChange}
              className="p-2 border rounded-md focus:ring-2 focus:ring-blue-300"
            >
              <option value="Regular">Regular</option>
              <option value="Special">Special</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Temporary Extension</label>
            <input
              type="date"
              name="extended_until"
              value={form.extended_until || ''}
              onChange={handleChange}
              className="p-2 border rounded-md focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="flex items-center col-span-1 gap-2 md:col-span-2">
            <input
              type="checkbox"
              name="is_recurring"
              checked={form.is_recurring}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label htmlFor="is_recurring" className="text-sm">Recurring</label>
          </div>

          <div className="flex items-center col-span-1 gap-2 md:col-span-2">
            <input
              type="checkbox"
              name="apply_multiplier"
              checked={form.apply_multiplier}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label htmlFor="apply_multiplier" className="text-sm">Apply Overtime Multiplier</label>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Default Multiplier</label>
            <input
              name="default_multiplier"
              type="number"
              step="0.01"
              min="0"
              value={form.default_multiplier}
              onChange={handleChange}
              className="p-2 border rounded-md focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">OT Multiplier</label>
            <input
              name="ot_multiplier"
              type="number"
              step="0.01"
              min="0"
              value={form.ot_multiplier}
              onChange={handleChange}
              className="p-2 border rounded-md focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="flex justify-end col-span-1 gap-2 mt-4 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-md ${
                isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HolidayModal;
