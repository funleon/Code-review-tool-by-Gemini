import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="flex items-center justify-center h-full">
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
        <strong className="font-bold">錯誤：</strong>
        <span className="block sm:inline">{message}</span>
        </div>
    </div>
  );
};

export default ErrorMessage;