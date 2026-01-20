import React, { useEffect, useState } from 'react';

const BranchModal = ({ isOpen, onClose, onSubmit, initialData = null, isEditing = false }) => {
  const [form, setForm] = useState({
    branch_id: null,
    name: '',
    address: '',
    phone: '',
    description: '',
    assigned_employee_id: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        branch_id: initialData.branch_id,
        name: initialData.name || '',
        address: initialData.address || '',
        phone: initialData.phone || '',
        description: initialData.description || '',
        assigned_employee_id: initialData.assigned_employee_id || '',
      });
    } else {
      setForm({ branch_id: null, name: '', address: '', phone: '', description: '', assigned_employee_id: '' });
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || form.name.trim() === '') return alert('Name required');
    const payload = { ...form };
    // if creating, remove branch_id if null
    if (!isEditing) delete payload.branch_id;
    onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Branch' : 'Add Branch'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input name="address" value={form.address} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Assigned Employee ID</label>
              <input name="assigned_employee_id" value={form.assigned_employee_id} onChange={handleChange} placeholder="E001 (optional)" className="w-full px-3 py-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="w-full px-3 py-2 border rounded" rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{isEditing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchModal;
