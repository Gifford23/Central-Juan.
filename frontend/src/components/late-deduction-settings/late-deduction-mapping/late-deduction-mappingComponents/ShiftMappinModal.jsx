import ShiftMappingForm from "./ShiftMappingForm";

export default function ShiftMappingModal({ open, onClose, shift, tiers, onSave }) {
  if (!open) return null; // ✅ only check open

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          {shift ? "Update Mapping" : "Assign Tier to Shift"}
        </h2>
        <ShiftMappingForm
          shift={shift || { shift_name: "Select a shift", id: null }}
          tiers={tiers}
          onSave={onSave}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
