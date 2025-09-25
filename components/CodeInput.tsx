import React from 'react';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
}

const CodeInput: React.FC<CodeInputProps> = ({ value, onChange }) => {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="在此貼上您的程式碼片段..."
        className="w-full h-[75vh] bg-gray-800 text-gray-200 p-4 rounded-lg font-mono text-sm border-2 border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 resize-none"
        spellCheck="false"
      />
    </div>
  );
};

export default CodeInput;