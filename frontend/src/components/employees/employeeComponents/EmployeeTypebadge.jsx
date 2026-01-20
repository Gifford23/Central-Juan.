import PropTypes from "prop-types";

// Central config for all employee types
const employeeTypes = {
  Regular: { label: "Regular", color: "bg-green-500 text-white" },
  "Part-time": { label: "Part-time", color: "bg-yellow-500 text-white" },
  OJT: { label: "OJT", color: "bg-blue-500 text-white" },
  Contractual: { label: "Contractual", color: "bg-red-500 text-white" },
  "Project-Based": { label: "Project-Based", color: "bg-purple-500 text-white" },
};

export default function EmployeeTypeBadge({
  type,
  editable = false,
  onChange,
  className = "",
}) {
  const selected = employeeTypes[type] || { label: "Unknown", color: "bg-gray-300 text-black" };

  if (editable) {
    // Dropdown mode – apply color to the <select> but keep options default (white)
    return (
      <select
        value={type}
        onChange={(e) => onChange?.(e.target.value)}
        className={`px-2 py-1 rounded-full text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-blue-400 ${selected.color} ${className}`}
      >
        {Object.entries(employeeTypes).map(([value, { label }]) => (
          <option
            key={value}
            value={value}
            className="text-black bg-white" // Force white background for options
          >
            {label}
          </option>
        ))}
      </select>
    );
  }

  // Badge mode
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selected.color} ${className}`}>
      {selected.label}
    </span>
  );
}

EmployeeTypeBadge.propTypes = {
  type: PropTypes.string,
  editable: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
};



/// import PropTypes from "prop-types";

// // Central config for all employee types
// const employeeTypes = {
//   Regular: { label: "Regular", color: "bg-green-500 text-white" },
//   "Part-time": { label: "Part-time", color: "bg-yellow-500 text-white" },
//   OJT: { label: "OJT", color: "bg-blue-500 text-white" },
//   Contractual: { label: "Contractual", color: "bg-red-500 text-white" },
//   "Project-Based": { label: "Project-Based", color: "bg-purple-500 text-white" },
// };

// export default function EmployeeTypeBadge({
//   type,
//   editable = false,
//   onChange,
//   className = "",
// }) {
//   const selected = employeeTypes[type] || { label: "Unknown", color: "bg-gray-300 text-black" };

//   if (editable) {
//     // Dropdown mode – apply color to the <select> but keep options default (white)
//     return (
//       <select
//         value={type}
//         onChange={(e) => onChange?.(e.target.value)}
//         className={`px-2 py-1 rounded-full text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-blue-400 ${selected.color} ${className}`}
//       >
//         {Object.entries(employeeTypes).map(([value, { label }]) => (
//           <option
//             key={value}
//             value={value}
//             className="text-black bg-white" // Force white background for options
//           >
//             {label}
//           </option>
//         ))}
//       </select>
//     );
//   }

//   // Badge mode
//   return (
//     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selected.color} ${className}`}>
//       {selected.label}
//     </span>
//   );
// }

// EmployeeTypeBadge.propTypes = {
//   type: PropTypes.string,
//   editable: PropTypes.bool,
//   onChange: PropTypes.func,
//   className: PropTypes.string,
// };
