import ShiftCard from "./ShiftCard";

export default function ShiftMappingList({ shifts, onEdit, onRemove }) {
  if (!shifts || shifts.length === 0) {
    return <p className="text-gray-500">No shift mappings found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {shifts.map((shift) => (
        <div key={shift.id ?? `shift-${shift.work_time_id}`} className="w-full overflow-y-hidden">
          <ShiftCard
            shift={shift}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        </div>
      ))}
    </div>
  );
}
