import React, { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import Header from './components/Header';
import CodeInput from './components/CodeInput';
import LanguageSelector from './components/LanguageSelector';
import ReviewOutput from './components/ReviewOutput';
import Spinner from './components/Spinner';
import ErrorMessage from './components/ErrorMessage';
import { reviewCode } from './services/geminiService';
import { detectLanguage } from './services/languageDetector';
import { SUPPORTED_LANGUAGES, FILE_EXTENSION_TO_LANGUAGE_MAP, LANGUAGE_FILENAME_MAP } from './constants';

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const ClearIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// Helper functions defined outside the component for stability
const generateFileTree = (zip: JSZip): string => {
    let tree = '專案檔案結構:\n';
    const sortedPaths = Object.keys(zip.files).sort();
    const createIndent = (depth: number) => '  '.repeat(depth);
    const seenPaths = new Set<string>();

    sortedPaths.forEach(path => {
        const parts = path.replace(/\/$/, '').split('/');
        parts.forEach((part, i) => {
            const currentPath = parts.slice(0, i + 1).join('/');
            if (!seenPaths.has(currentPath)) {
                const depth = i;
                const isDir = i < parts.length - 1 || zip.files[path].dir;
                const prefix = isDir ? '📁' : '📄';
                tree += `${createIndent(depth)}${prefix} ${part}\n`;
                seenPaths.add(currentPath);
            }
        });
    });
    return tree;
};

const detectLanguageFromZip = (zip: JSZip): string | null => {
    const extensionCounts: { [key: string]: number } = {};
    
    Object.keys(zip.files).forEach(path => {
        if (zip.files[path].dir) return;
        const extension = path.split('.').pop()?.toLowerCase();
        if (extension && FILE_EXTENSION_TO_LANGUAGE_MAP[extension]) {
            extensionCounts[extension] = (extensionCounts[extension] || 0) + 1;
        }
    });

    if (Object.keys(extensionCounts).length === 0) return null;

    const majorExtension = Object.keys(extensionCounts).reduce((a, b) => extensionCounts[a] > extensionCounts[b] ? a : b);
    return FILE_EXTENSION_TO_LANGUAGE_MAP[majorExtension] || null;
};

const prepareProjectContentForReview = async (file: File): Promise<string> => {
    const jszip = new JSZip();
    const zip = await jszip.loadAsync(file);
    let projectContent = '這是一個多檔案專案。以下是檔案的內容：\n\n';
    
    const contentPromises = Object.keys(zip.files).map(async (path) => {
        const zipObject = zip.files[path];
        if (!zipObject.dir) {
            try {
                const content = await zipObject.async('string');
                if (content.includes('\u0000')) {
                    return `--- FILE: ${path} ---\n(二進位檔案，內容不顯示)\n\n`;
                }
                return `--- FILE: ${path} ---\n${content}\n\n`;
            } catch (e) {
                return `--- FILE: ${path} ---\n(無法將檔案讀取為文字)\n\n`;
            }
        }
        return '';
    });
    
    const contents = await Promise.all(contentPromises);
    projectContent += contents.join('');
    return projectContent;
};

const validateCodeLanguage = (
    code: string,
    selectedLanguage: string,
    hasSeenUndetectedWarning: boolean
): { proceed: boolean; language?: string; error?: string; setWarningFlag?: boolean } => {
    const detectedLanguage = detectLanguage(code);

    if (detectedLanguage && detectedLanguage !== selectedLanguage && SUPPORTED_LANGUAGES.includes(detectedLanguage)) {
        return {
            proceed: false,
            language: detectedLanguage,
            error: `您提供的程式碼疑似為 ${detectedLanguage}，與您選擇的 ${selectedLanguage} 不一樣，我將為您更改，並請重新按[審查程式碼]提交程式。`,
        };
    }

    if (detectedLanguage === null && !hasSeenUndetectedWarning) {
        return {
            proceed: false,
            error: "系統無法判斷您提交的程式是何種語言，請確認選擇選單上正確的語言名稱，再按一次[審查程式碼]",
            setWarningFlag: true,
        };
    }

    return { proceed: true };
};


const App: React.FC = () => {
  const [inputType, setInputType] = useState<'code' | 'zip'>('code');
  const [code, setCode] = useState<string>('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [fileTree, setFileTree] = useState<string>('');
  const [language, setLanguage] = useState<string>(SUPPORTED_LANGUAGES[0]);
  const [review, setReview] = useState<string>('');
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('分析程式碼中...');
  const [error, setError] = useState<string | null>(null);
  const [hasSeenUndetectedWarning, setHasSeenUndetectedWarning] = useState<boolean>(false);
  
  const reviewOutputRef = useRef<HTMLDivElement>(null);
  
  const handleClearUpload = useCallback(() => {
    setInputType('code');
    setZipFile(null);
    setFileTree('');
    setCode('');
    setError(null);
    setScore(null);
    setReview('');
  }, []);

  const handleCodeChange = useCallback((newCode: string) => {
    if (inputType === 'zip') {
        handleClearUpload();
    }
    setCode(newCode);
    if (review) setReview('');
    if (score) setScore(null);
    if (error) setError(null);
    if (hasSeenUndetectedWarning) setHasSeenUndetectedWarning(false);
  }, [error, hasSeenUndetectedWarning, inputType, handleClearUpload, review, score]);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    setLanguage(newLanguage);
    if (error) setError(null);
  }, [error]);
  
  const handleReview = useCallback(async () => {
    if (inputType === 'code' && !code.trim()) {
      setError('請輸入要審查的程式碼。');
      return;
    }
    if (inputType === 'zip' && !zipFile) {
        setError('請上傳一個ZIP檔進行審查。');
        return;
    }

    if (inputType === 'code') {
        const validation = validateCodeLanguage(code, language, hasSeenUndetectedWarning);
        if (!validation.proceed) {
            if (validation.error) setError(validation.error);
            if (validation.language) setLanguage(validation.language);
            if (validation.setWarningFlag) setHasSeenUndetectedWarning(true);
            return;
        }
    }

    setLoadingMessage('分析程式碼中...');
    setIsLoading(true);
    setError(null);
    setReview('');
    setScore(null);
    if (inputType === 'code') setHasSeenUndetectedWarning(false);

    try {
      let codeToReview = code;
      if (inputType === 'zip' && zipFile) {
          setLoadingMessage('準備專案以供審查...');
          codeToReview = await prepareProjectContentForReview(zipFile);
      }
      setLoadingMessage('分析程式碼中...');
      const { review: result, score: newScore } = await reviewCode(codeToReview, language);
      setReview(result);
      setScore(newScore);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('發生了未預期的錯誤。');
      }
    } finally {
      setIsLoading(false);
    }
  }, [code, language, hasSeenUndetectedWarning, inputType, zipFile]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (event.target) {
        event.target.value = '';
    }

    if (file.name.endsWith('.zip')) {
        setIsLoading(true);
        setLoadingMessage('正在處理ZIP檔...');
        try {
            const jszip = new JSZip();
            const zip = await jszip.loadAsync(file);
            const tree = generateFileTree(zip);
            const detectedLang = detectLanguageFromZip(zip);

            setInputType('zip');
            setZipFile(file);
            setFileTree(tree);
            setCode('');
            if (detectedLang && SUPPORTED_LANGUAGES.includes(detectedLang)) {
                setLanguage(detectedLang);
            }
            setError(null);
            setReview('');
            setScore(null);
        } catch (e) {
            setError('讀取或處理ZIP檔時失敗。檔案可能已損壞或格式不受支援。');
            handleClearUpload();
        } finally {
            setIsLoading(false);
        }
    } else {
        setInputType('code');
        setZipFile(null);
        setFileTree('');
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result;
          if (typeof text === 'string') {
            handleCodeChange(text);
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (extension) {
                const detectedLang = FILE_EXTENSION_TO_LANGUAGE_MAP[extension];
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
    }
  }, [handleCodeChange, handleClearUpload]);

  const getExportFilename = useCallback(() => {
    const now = new Date();
    const dateString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const sanitizedLanguage = LANGUAGE_FILENAME_MAP[language] || language.replace(/[^a-zA-Z0-9]/g, '');
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
            <div className="flex items-center space-x-2">
              <LanguageSelector
                selectedLanguage={language}
                onLanguageChange={handleLanguageChange}
              />
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                accept=".zip,.sql,.cs,.js,.html,.css,.ts,.py,.java,.cpp,.cxx,.cc,.hpp,.hxx,.h,.go,.rs,.rb,.php,.swift,.kt,.kts,.txt"
              />
              <label
                htmlFor="file-upload"
                className="flex-shrink-0 flex items-center justify-center space-x-2 cursor-pointer bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              >
                <UploadIcon />
                <span>上傳檔案</span>
              </label>
               {inputType === 'zip' && (
                <button
                    onClick={handleClearUpload}
                    className="flex-shrink-0 flex items-center justify-center space-x-2 cursor-pointer bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    aria-label="Clear uploaded zip file"
                >
                    <ClearIcon />
                    <span>清除 Zip</span>
                </button>
              )}
              <button
                onClick={handleReview}
                disabled={isLoading}
                className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              >
                {isLoading ? '審查中...' : '審查程式碼'}
              </button>
            </div>
            <CodeInput value={inputType === 'zip' ? fileTree : code} onChange={handleCodeChange} readOnly={inputType === 'zip'} />
          </div>

          {/* Output Section */}
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-semibold text-gray-300">Gemini的回饋</h2>
            <div className="flex justify-end items-center space-x-4">
                {score !== null && !isLoading && (
                    <div className="flex items-baseline space-x-2 bg-gray-700/50 px-4 py-2 rounded-lg border border-gray-600">
                        <span className="text-gray-400 font-medium">審查結果：</span>
                        <span className="text-2xl font-bold text-indigo-400">{score}</span>
                        <span className="text-gray-400">/ 100</span>
                    </div>
                )}
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