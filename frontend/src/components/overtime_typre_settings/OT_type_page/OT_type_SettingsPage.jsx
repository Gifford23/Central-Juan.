import { useEffect, useState } from 'react';
import OT_Multiplier_Modal from '../OT_type_componets/OT_Multiplier_Modal';
import OT_Multiplier_Table from '../OT_type_componets/OT_Multiplier_Table';
import useOTTypeHooks from '../OT_type_hooks/OT_type_hooks';
import { useSession } from "../../../context/SessionContext";
// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../../users/hooks/usePermissions"; 

const OvertimeTypeSettingsPage = () => {
  const {
    multipliers,
    fetchMultipliers,
    addMultiplier,
    updateMultiplier,
    deleteMultiplier,
    toggleMultiplier,
  } = useOTTypeHooks();
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    fetchMultipliers();
  }, []);

  return (
    <div className="p-6">
      {/* Responsive header: title left, add button right (stacks on xs) */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Overtime Multiplier Settings</h2>

        {/* Add button (permission-guarded) */}
        {!permLoading && permissions?.can_add && (
          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                setEditData(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="Add Overtime Type"
            >
              {/* small plus symbol for compactness on narrow screens */}
              <span className="inline-block w-4 h-4 leading-none text-white">+</span>
              {/* hide text on very narrow screens to save space */}
              <span className="hidden sm:inline">Add Overtime Type</span>
            </button>
          </div>
        )}
      </div>

      {/* Table / list (keeps original usage) */}
      <OT_Multiplier_Table
        multipliers={multipliers}
        onEdit={(data) => {
          setEditData(data);
          setModalOpen(true);
        }}
        onDelete={deleteMultiplier}
        onToggle={toggleMultiplier}
      />

      {/* Modal */}
      <OT_Multiplier_Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(data) => {
          editData ? updateMultiplier(data) : addMultiplier(data);
          setModalOpen(false);
        }}
        initialData={editData}
      />
    </div>
  );
};

export default OvertimeTypeSettingsPage;



// import { useEffect, useState } from 'react';
// import OT_Multiplier_Modal from '../OT_type_componets/OT_Multiplier_Modal';
// import OT_Multiplier_Table from '../OT_type_componets/OT_Multiplier_Table';
// import useOTTypeHooks from '../OT_type_hooks/OT_type_hooks';
// import { useSession } from "../../../context/SessionContext";
// // import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
// import usePermissions from "../../../users/hooks/usePermissions"; 

// const OvertimeTypeSettingsPage = () => {
//   const {
//     multipliers,
//     fetchMultipliers,
//     addMultiplier,
//     updateMultiplier,
//     deleteMultiplier,
//     toggleMultiplier,
//   } = useOTTypeHooks();
//   const { user } = useSession();
//   const { permissions, loading: permLoading } = usePermissions(user?.username);

//   const [modalOpen, setModalOpen] = useState(false);
//   const [editData, setEditData] = useState(null);

//   useEffect(() => {
//     fetchMultipliers();
//   }, []);

//   return (
//     <div className="p-6">
//       <h2 className="mb-4 text-2xl font-bold">Overtime Multiplier Settings</h2>
// {!permLoading && permissions.can_add && (

//       <button
//         className="px-4 py-2 mb-4 text-white bg-blue-500 rounded"
//         onClick={() => {
//           setEditData(null);
//           setModalOpen(true);
//         }}
//       >
//         + Add Overtime Type
//       </button>
// )}
//       <OT_Multiplier_Table
//         multipliers={multipliers}
//         onEdit={(data) => {
//           setEditData(data);
//           setModalOpen(true);
//         }}
//         onDelete={deleteMultiplier}
//         onToggle={toggleMultiplier}
//       />

//       <OT_Multiplier_Modal
//         isOpen={modalOpen}
//         onClose={() => setModalOpen(false)}
//         onSubmit={(data) => {
//           editData ? updateMultiplier(data) : addMultiplier(data);
//           setModalOpen(false);
//         }}
//         initialData={editData}
//       />
//     </div>
//   );
// };

// export default OvertimeTypeSettingsPage;
