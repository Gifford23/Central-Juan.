import { useEffect, useState } from "react";
import Button from "@mui/material/Button"; // ✅ MUI Button
import { useWorkTimeLateDeduction } from "../late-deduction-mappingHooks/useWorkTimeLateDeductions";
import ShiftMappingList from "./ShiftMappingList";
import ShiftMappingModal from "./ShiftMappinModal";

export default function ShiftMappingManager() {
  const { mappings, fetchMappings, assignTierToShift, updateMapping, tiers, removeMapping } =
    useWorkTimeLateDeduction();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const handleEdit = (shift) => {
    setSelectedShift(shift);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
if (selectedShift?.tier_id) {
  await updateMapping(selectedShift.id, data); // mapping id for update
} else {
  await assignTierToShift(data); // data.work_time_id for create
}

    setModalOpen(false);
    setSelectedShift(null);
  };

  const handleRemove = async (id) => {
    await removeMapping(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Shift ↔ late Tier Mapping</h1>
        {/* <Button 
          variant="contained" 
          color="primary" 
          onClick={() => setModalOpen(true)}
        >
          Add Mapping
        </Button> */}
      </div>

      <div className="overflow-y-auto">
        <ShiftMappingList
          shifts={Array.isArray(mappings) ? mappings : mappings?.data || []}
          onEdit={handleEdit}
          onRemove={handleRemove}
        />
      </div>

      <ShiftMappingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        shift={selectedShift}
        tiers={tiers}
        onSave={handleSave}
      />
    </div>
  );
}
