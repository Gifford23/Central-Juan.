import { Search } from 'lucide-react';

export default function SearchAndFilter({ value, onChange }) {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <input
        type="text"
        placeholder="Search..."
        className="w-full h-10 pl-10 pr-4 text-sm text-gray-800 transition duration-200 bg-gray-100 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        value={value}
        onChange={onChange}
      />
      <div className="absolute inset-y-0 flex items-center pointer-events-none left-3">
        <Search size={18} className="text-gray-500" />
      </div>
    </div>
  );
}
