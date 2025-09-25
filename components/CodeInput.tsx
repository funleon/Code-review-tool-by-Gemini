import React from 'react';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const CodeInput: React.FC<CodeInputProps> = ({ value, onChange, readOnly = false }) => {
  const placeholderText = readOnly
    ? "已載入 ZIP 檔案。檔案結構顯示於此處。"
    : "在此貼上您的程式碼片段...";
  
  const baseClasses = "w-full h-[75vh] p-4 rounded-lg font-mono text-sm border-2 resize-none transition-colors duration-300";
  const dynamicClasses = readOnly 
    ? "bg-gray-800 border-gray-700 text-gray-400 cursor-default" 
    : "bg-gray-800 border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderText}
        className={`${baseClasses} ${dynamicClasses}`}
        spellCheck="false"
        readOnly={readOnly}
      />
    </div>
  );
};

export default CodeInput;