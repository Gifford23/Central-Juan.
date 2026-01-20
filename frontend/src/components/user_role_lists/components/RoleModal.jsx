import React, { useState, useEffect } from "react";

export default function RoleModal({ isOpen, onClose, onSave, initialData }) {
  const [roleName, setRoleName] = useState("");

  useEffect(() => {
    if (initialData) {
      setRoleName(initialData.role_name);
    } else {
      setRoleName("");
    }
  }, [initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[400px] shadow-lg">
        <h2 className="text-lg font-semibold mb-4">
          {initialData ? "Edit Role" : "Add Role"}
        </h2>

        <input
          type="text"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          placeholder="Enter role name"
          className="w-full p-2 border rounded mb-4"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (roleName.trim()) {
                onSave(roleName);
              }
            }}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
