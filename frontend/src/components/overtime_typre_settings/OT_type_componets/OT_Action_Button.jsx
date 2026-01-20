const OT_Action_Button = ({ onEdit, onDelete, onToggle, isEnabled }) => {
  return (
    <div className="flex gap-2">
      <button onClick={onEdit} className="text-blue-600 hover:underline">Edit</button>
      <button onClick={onDelete} className="text-red-600 hover:underline">Delete</button>
      <button
        onClick={onToggle}
        className={`text-sm px-2 py-1 rounded ${
          isEnabled ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
        }`}
      >
        {isEnabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
};

export default OT_Action_Button;
