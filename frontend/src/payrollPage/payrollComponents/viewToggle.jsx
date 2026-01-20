// components/payroll/ViewToggle.jsx
import { AlignJustify, Grid3x3 } from 'lucide-react';

export default function ViewToggle({ active, onList, onGrid }) {
  return (
    <div className="flex flex-row h-10 overflow-hidden border rounded-lg w-fit divide-x-1 employee-newheaderbuttons-outline">
      <div
        onClick={onList}
        className={`w-10 cursor-pointer hover:bg-[#ACCCFC]/50 ${active === 'list' ? 'employee-newheaderbuttons-solid' : ''}`}
      >
        <AlignJustify size={23} />
      </div>
      <div
        onClick={onGrid}
        className={`w-10 cursor-pointer hover:bg-[#ACCCFC]/50 ${active === 'grid' ? 'employee-newheaderbuttons-solid' : ''}`}
      >
        <Grid3x3 size={23} />
      </div>
    </div>
  );
}
