import React from 'react';

interface SpinnerProps {
    message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message = "分析程式碼中..." }) => {
  return (
    <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center rounded-lg z-20">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
        <p className="mt-4 text-lg text-gray-300">{message}</p>
      </div>
    </div>
  );
};

export default Spinner;