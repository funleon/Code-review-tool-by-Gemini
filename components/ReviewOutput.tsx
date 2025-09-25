import React from 'react';

interface ReviewOutputProps {
  review: string;
}

const ReviewOutput: React.FC<ReviewOutputProps> = ({ review }) => {
  if (!review) {
    return (
      <div className="flex items-center justify-center h-full" data-review-content>
        <p className="text-gray-500 text-center">
          您的程式碼審查回饋將會顯示在這裡。
        </p>
      </div>
    );
  }

  const renderContent = () => {
    const lines = review.split('\n');
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLang = '';

    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' = 'ul';

    const flushList = () => {
      if (listItems.length > 0) {
        const ListComponent = listType;
        elements.push(
          <ListComponent key={`list-${elements.length}`} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} list-inside space-y-2 my-4 pl-4`}>
            {listItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ListComponent>
        );
        listItems = [];
      }
    };
    
    const flushCodeBlock = () => {
        if(codeBlockContent) {
            elements.push(
                <pre key={`pre-${elements.length}`} className="bg-gray-900 rounded-md p-4 my-4 overflow-x-auto">
                    <code className={`language-${codeBlockLang} text-sm`}>{codeBlockContent.trim()}</code>
                </pre>
            );
            codeBlockContent = '';
            codeBlockLang = '';
        }
    }

    lines.forEach((line, i) => {
        if (line.startsWith('```')) {
            flushList();
            if(inCodeBlock) {
                flushCodeBlock();
            } else {
                codeBlockLang = line.substring(3).trim();
            }
            inCodeBlock = !inCodeBlock;
            return;
        }

        if (inCodeBlock) {
            codeBlockContent += line + '\n';
            return;
        }
        
        const isUl = line.startsWith('* ') || line.startsWith('- ');
        const isOl = /^\d+\.\s/.test(line);

        if (!isUl && !isOl) {
            flushList();
        }

        if (line.trim() === '') {
             elements.push(<div key={i} className="h-4" />);
        } else if (line.startsWith('# ')) {
            elements.push(<h1 key={i} className="text-3xl font-bold mt-6 mb-3 pb-2 border-b border-gray-600">{line.substring(2)}</h1>);
        } else if (line.startsWith('## ')) {
            elements.push(<h2 key={i} className="text-2xl font-semibold mt-5 mb-2 pb-1 border-b border-gray-700">{line.substring(3)}</h2>);
        } else if (line.startsWith('### ')) {
            elements.push(<h3 key={i} className="text-xl font-semibold mt-4 mb-2">{line.substring(4)}</h3>);
        } else if (isUl) {
            listType = 'ul';
            listItems.push(line.substring(2));
        } else if (isOl) {
            listType = 'ol';
            listItems.push(line.replace(/^\d+\.\s/, ''));
        }
        else {
            const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g).filter(Boolean);
            const paragraphContent = parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return <code key={index} className="bg-gray-700 text-indigo-300 rounded px-1.5 py-1 text-sm font-mono">{part.slice(1, -1)}</code>;
                }
                return part;
            });
            elements.push(<p key={i} className="my-3 leading-relaxed">{paragraphContent}</p>);
        }
    });
    
    flushList();
    flushCodeBlock();

    return elements;
  };

  return <div className="text-gray-300 leading-relaxed" data-review-content>{renderContent()}</div>;
};

export default ReviewOutput;