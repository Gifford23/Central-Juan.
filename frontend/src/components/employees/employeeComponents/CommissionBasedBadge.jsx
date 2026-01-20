import PropTypes from "prop-types";

// Central config for commission-based status
const commissionOptions = {
  yes: { label: "Yes", color: "bg-indigo-500 text-white" },
  no: { label: "No", color: "bg-gray-300 text-gray-800" },
};

export default function CommissionBasedBadge({
  value,
  editable = false,
  onChange,
  className = "",
}) {
  const normalized =
    String(value).toLowerCase() === "yes" ||
    value === 1 ||
    value === true
      ? "yes"
      : "no";

  const selected = commissionOptions[normalized];

  if (editable) {
    return (
      <select
        value={normalized}
        onChange={(e) => onChange?.(e.target.value)}
        className={`
          min-w-[90px]
          px-3 py-1.5
          rounded-full
          text-sm font-semibold
          border
          focus:outline-none focus:ring-2 focus:ring-indigo-400
          ${selected.color}
          ${className}
        `}
      >
        {Object.entries(commissionOptions).map(([value, { label }]) => (
          <option
            key={value}
            value={value}
            className="bg-white text-black"
          >
            {label}
          </option>
        ))}
      </select>
    );
  }

  // Read-only badge
  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[90px]
        px-3 py-1.5
        rounded-full
        text-sm font-semibold
        ${selected.color}
        ${className}
      `}
    >
      {selected.label}
    </span>
  );
}

CommissionBasedBadge.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool,
  ]),
  editable: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
};
