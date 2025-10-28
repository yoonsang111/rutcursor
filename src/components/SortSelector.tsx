import React from "react";

interface SortSelectorProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}

const SortSelector: React.FC<SortSelectorProps> = ({ sortBy, onSortChange }) => {
  const sortOptions = [
    { value: "popular", label: "인기순" },
    { value: "latest", label: "최신순" },
  ];

  return (
    <div className="flex items-center gap-2">
      <svg className="h-3 w-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
      <span className="text-xs font-medium text-gray-700">정렬:</span>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-100 transition-all duration-200 bg-white shadow-sm"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortSelector; 