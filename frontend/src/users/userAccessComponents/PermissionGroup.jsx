// PermissionGroup.jsx
import React from "react";

export default function PermissionGroup({ group, perms, permissions, togglePermission }) {
  return (
    <div>
      <h4 className="text-md font-medium text-blue-600 mb-2">{group}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-2">
        {Object.entries(perms).map(([key, label]) => (
          <label
            key={key}
            className="flex items-center gap-2 p-2 rounded-lg border hover:bg-blue-100 cursor-pointer"
          >
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              checked={permissions[key] === "yes"}
              onChange={() => togglePermission(key)}
            />
            <span className="text-gray-700 text-sm sm:text-base whitespace-normal break-words">
              {label}
            </span>
          </label>
        ))}
      </div>
      <hr className="my-4 border-gray-300" />
    </div>
  );
}
