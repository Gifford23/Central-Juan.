import PropTypes from "prop-types";

const EmployeeTypeSelect = ({ value, onChange, className = "", disabled = false }) => {
  return (
    <div className="flex flex-col w-full p-1 justify-evenly">
      <label htmlFor="employee_type">Employee Type</label> 
      <select
        name="employee_type"
        className={`font-mono modal-input-style ${className}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <option value="Regular">Regular</option>
        <option value="Part-time">Part-time</option>
        <option value="OJT">OJT</option>
        <option value="Contractual">Contractual</option>
        <option value="Project-Based">Project-Based</option> {/* Added option for Project-Based */}
      </select>
    </div>
  );
};

EmployeeTypeSelect.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

export default EmployeeTypeSelect;
