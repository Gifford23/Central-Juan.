// EmployeeModalButton.jsx
import React from "react";
import { Plus } from "lucide-react";

const EmployeeModalButton = ({ onClick }) => {
  return (
    <button
      className="items-center w-10 h-10 rounded-lg cursor-pointer employee-newheaderbuttons-solid place-items-center hover:transition hover:duration-400 hover:ease-out hover:scale-95"
      onClick={onClick}
    >
      <Plus size={25} fontWeight={20} />
    </button>
  );
};

export default EmployeeModalButton;
