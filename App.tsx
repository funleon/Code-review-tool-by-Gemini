import React, { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import CodeInput from './components/CodeInput';
import LanguageSelector from './components/LanguageSelector';
import ReviewOutput from './components/ReviewOutput';
import Spinner from './components/Spinner';
import ErrorMessage from './components/ErrorMessage';
import { reviewCode } from './services/geminiService';
import { detectLanguage } from './services/languageDetector';
import { SUPPORTED_LANGUAGES } from './constants';

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const App: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>(SUPPORTED_LANGUAGES[0]);
  const [review, setReview] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('分析程式碼中...');
  const [error, setError] = useState<string | null>(null);
  const [hasSeenUndetectedWarning, setHasSeenUndetectedWarning] = useState<boolean>(false);
  
  const reviewOutputRef = useRef<HTMLDivElement>(null);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (error) setError(null);
    if (hasSeenUndetectedWarning) setHasSeenUndetectedWarning(false);
  }, [error, hasSeenUndetectedWarning]);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setLanguage(newLanguage);
    if (error) setError(null);
    // DO NOT reset hasSeenUndetectedWarning here.
  }, [error]);

  const handleReview = useCallback(async () => {
    if (!code.trim()) {
      setError('請輸入要審查的程式碼。');
      return;
    }

    const detectedLanguage = detectLanguage(code);
    
    if (detectedLanguage && detectedLanguage !== language && SUPPORTED_LANGUAGES.includes(detectedLanguage)) {
        const warningMessage = `您提供的程式碼疑似為 ${detectedLanguage}，與您選擇的 ${language} 不一樣，我將為您更改，並請重新按[審查程式碼]提交程式。`;
        setError(warningMessage);
        setLanguage(detectedLanguage);
        return;
    }
    
    if (detectedLanguage === null && !hasSeenUndetectedWarning) {
        setError("系統無法判斷您提交的程式是何種語言，請確認選擇選單上正確的語言名稱，再按一次[審查程式碼]");
        setHasSeenUndetectedWarning(true);
        return;
    }

    setLoadingMessage('分析程式碼中...');
    setIsLoading(true);
    setError(null);
    setReview('');
    setHasSeenUndetectedWarning(false); // Reset before proceeding

    try {
      const result = await reviewCode(code, language);
      setReview(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('發生了未預期的錯誤。');
      }
    } finally {
      setIsLoading(false);
    }
  }, [code, language, hasSeenUndetectedWarning]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        handleCodeChange(text);
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension) {
            const langMap: { [key: string]: string } = {
                'cs': 'C#', 'js': 'JavaScript', 'html': 'HTML', 'htm': 'HTML', 'css': 'CSS',
                'sql': 'T-SQL', 'ts': 'TypeScript', 'py': 'Python', 'java': 'Java',
                'cpp': 'C++', 'cxx': 'C++', 'cc': 'C++', 'hpp': 'C++', 'hxx': 'C++', 'h': 'C++',
                'go': 'Go', 'rs': 'Rust', 'rb': 'Ruby', 'php': 'PHP', 'swift': 'Swift', 'kt': 'Kotlin',
            };
            const detectedLang = langMap[extension];
            if (detectedLang && SUPPORTED_LANGUAGES.includes(detectedLang)) {
                setLanguage(detectedLang);
            }
        }
      }
    };
    reader.onerror = () => {
      setError('讀取檔案時發生錯誤。');
    };
    reader.readAsText(file);
    
    if(event.target) {
        event.target.value = '';
    }
  }, [handleCodeChange]);

  const getExportFilename = useCallback(() => {
    const now = new Date();
    const dateString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    let sanitizedLanguage = language.replace(/[^a-zA-Z0-9]/g, '');
    if (language === 'C++') sanitizedLanguage = 'CPP';
    if (language === 'C#') sanitizedLanguage = 'CSharp';
    return `gemini-code-review-${sanitizedLanguage}_${dateString}`;
  }, [language]);

  const handleExportMD = useCallback(() => {
    if (!review) return;
    const blob = new Blob([review], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getExportFilename()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [review, getExportFilename]);
  
  const exportButtonClasses = "bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50";

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Input Section */}
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-semibold text-gray-300">您的程式碼</h2>
            <div className="flex items-center space-x-4">
              <LanguageSelector
                selectedLanguage={language}
                onLanguageChange={handleLanguageChange}
              />
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                accept=".sql,.cs,.js,.html,.css,.ts,.py,.java,.cpp,.cxx,.cc,.hpp,.hxx,.h,.go,.rs,.rb,.php,.swift,.kt,.kts,.txt"
              />
              <label
                htmlFor="file-upload"
                className="flex-shrink-0 flex items-center justify-center space-x-2 cursor-pointer bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                <UploadIcon />
                <span>上傳檔案</span>
              </label>
              <button
                onClick={handleReview}
                disabled={isLoading}
                className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              >
                {isLoading ? '審查中...' : '審查程式碼'}
              </button>
            </div>
            <CodeInput value={code} onChange={handleCodeChange} />
          </div>

          {/* Output Section */}
          <div className="flex flex-col space-y-4">
             <h2 className="text-2xl font-semibold text-gray-300">Gemini的回饋</h2>
             <div className="flex justify-end items-center space-x-2">
                <button onClick={handleExportMD} disabled={!review || isLoading} className={exportButtonClasses}>
                    匯出為 md檔
                </button>
             </div>
             <div ref={reviewOutputRef} className="bg-gray-800 rounded-lg p-6 h-[75vh] relative overflow-auto border border-gray-700">
                {isLoading && <Spinner message={loadingMessage} />}
                {error && <ErrorMessage message={error} />}
                {!isLoading && !error && <ReviewOutput review={review} />}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;