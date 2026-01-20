// OT_Multiplier_Table.jsx
import React from "react";
import OT_Action_Button from "./OT_Action_Button";

const OT_Multiplier_Table = ({ multipliers = [], onEdit, onDelete, onToggle }) => {
  return (
    <div className="w-full">
      {/* Header row for md+ */}
      <div className="items-center hidden grid-cols-12 gap-4 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-t-lg md:grid">
        <div className="col-span-5 font-medium">Label</div>
        <div className="col-span-2 font-medium text-center">Multiplier</div>
        <div className="col-span-2 font-medium text-center">Status</div>
        <div className="col-span-3 font-medium text-right">Actions</div>
      </div>

      {/* List */}
      <div className="flex flex-col border border-gray-200 divide-y rounded-b-lg">
        {Array.isArray(multipliers) && multipliers.length > 0 ? (
          multipliers.map((item) => (
            <article
              key={item.id}
              className="flex flex-col items-center gap-4 px-4 py-3 transition md:grid md:grid-cols-12 hover:bg-gray-50"
            >
              {/* Label area */}
              <div className="col-span-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {item.label}
                    </div>
                    {/* optional small description if you have one */}
                    {item.description && (
                      <div className="hidden mt-1 text-xs text-gray-500 md:block">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Multiplier */}
              <div className="col-span-2 mt-2 text-sm text-center md:mt-0">
                <div className="inline-block px-3 py-1 font-medium text-gray-700 border border-gray-200 rounded-full bg-gray-50">
                  {item.multiplier}
                </div>
              </div>

              {/* Status */}
              <div className="col-span-2 mt-2 text-center md:mt-0">
                <span
                  className={`inline-flex items-center gap-2 px-2 py-1 text-xs font-semibold rounded-full ${
                    item.is_enabled ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                  }`}
                  aria-label={item.is_enabled ? "Enabled" : "Disabled"}
                >
                  <svg
                    className={`w-3 h-3 ${item.is_enabled ? "text-green-600" : "text-red-600"}`}
                    fill="currentColor"
                    viewBox="0 0 8 8"
                  >
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  {item.is_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end col-span-3 gap-2 mt-3 md:mt-0">
                <OT_Action_Button
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id)}
                  onToggle={() => onToggle(item.id, !item.is_enabled)}
                  isEnabled={item.is_enabled}
                />
              </div>

              {/* Mobile small hint row (shows multiplier/status compact) */}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500 md:hidden">
                <div>Multiplier: <span className="font-medium text-gray-700">{item.multiplier}</span></div>
                <div>Status: <span className="font-medium text-gray-700">{item.is_enabled ? "Enabled" : "Disabled"}</span></div>
              </div>
            </article>
          ))
        ) : (
          <div className="px-4 py-6 text-sm text-center text-gray-500">
            No overtime multipliers found.
          </div>
        )}
      </div>
    </div>
  );
};

export default OT_Multiplier_Table;




// import OT_Action_Button from './OT_Action_Button';

// const OT_Multiplier_Table = ({ multipliers, onEdit, onDelete, onToggle }) => {
//   return (
//     <table className="w-full text-left border border-gray-300">
//       <thead className="bg-gray-100">
//         <tr>
//           <th className="p-2">Label</th>
//           <th className="p-2">Multiplier</th>
//           <th className="p-2">Status</th>
//           <th className="p-2">Actions</th>
//         </tr>
//       </thead>
//       <tbody>
//         {multipliers.map((item) => (
//           <tr key={item.id} className="border-t">
//             <td className="p-2">{item.label}</td>
//             <td className="p-2">{item.multiplier}</td>
//             <td className="p-2">{item.is_enabled ? 'Enabled' : 'Disabled'}</td>
//             <td className="p-2">
//               <OT_Action_Button
//                 onEdit={() => onEdit(item)}
//                 onDelete={() => onDelete(item.id)}
//                 onToggle={() => onToggle(item.id, !item.is_enabled)}
//                 isEnabled={item.is_enabled}
//               />
//             </td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// };

// export default OT_Multiplier_Table;
