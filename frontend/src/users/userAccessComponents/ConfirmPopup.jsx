// ConfirmPopup.jsx
import React from "react";

export default function ConfirmPopup({
  newlyAddedPermissions,
  removedPermissions,
  onCancel,
  onConfirm,
  loading,
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-[700px] max-w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          Confirm Permission Update
        </h3>
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          Are you sure you want to update these permissions? <br />
          <span className="font-semibold text-red-600">
            These will affect the system once done.
          </span>
        </p>

        {/* Added */}
        <div className="mb-6">
          <h4 className="font-semibold text-green-700 text-lg mb-3">
            Newly Added Permissions:
          </h4>
          {newlyAddedPermissions.length > 0 ? (
            <ul className="list-disc pl-6 space-y-2 text-base text-gray-800">
              {newlyAddedPermissions.map((perm, idx) => (
                <li key={idx}>
                  <span className="font-semibold">{perm.group}:</span>{" "}
                  {perm.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-base">No new permissions added.</p>
          )}
        </div>

        {/* Removed */}
        <div className="mb-8">
          <h4 className="font-semibold text-red-700 text-lg mb-3">
            Removed Permissions:
          </h4>
          {removedPermissions.length > 0 ? (
            <ul className="list-disc pl-6 space-y-2 text-base text-gray-800">
              {removedPermissions.map((perm, idx) => (
                <li key={idx}>
                  <span className="font-semibold">{perm.group}:</span>{" "}
                  {perm.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-base">No permissions removed.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-base font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow"
          >
            {loading ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
