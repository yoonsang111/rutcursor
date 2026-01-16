import React from "react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSearch?: (v: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onSearch }) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch && value.trim()) {
      onSearch(value);
    }
  };

  const handleSearchClick = () => {
    if (onSearch && value.trim()) {
      onSearch(value);
    }
  };

  return (
    <div className="relative max-w-xl mx-auto">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="어떤 액티비티를 찾고 계신가요?"
        className="w-full pl-10 pr-20 py-3 text-base border border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
        {value && (
          <button
            onClick={() => onChange("")}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          onClick={handleSearchClick}
          className={`p-2 rounded-lg transition-all duration-200 ${
            value.trim()
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          type="button"
          disabled={!value.trim()}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SearchBar; 