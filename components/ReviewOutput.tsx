import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';

interface ReviewOutputProps {
  review: string;
}

// A more specific type for the props passed to the custom code component,
// removing the unused 'node' prop to avoid using 'any'.
interface CustomCodeRendererProps {
    inline?: boolean;
    className?: string;
    children: React.ReactNode;
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

  return (
    <div className="text-gray-300 leading-relaxed" data-review-content>
      <ReactMarkdown
        components={{
          // Custom renderer for code blocks to add syntax highlighting
          code({ inline, className, children, ...props }: CustomCodeRendererProps) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={`${className || ''} bg-gray-700 text-indigo-300 rounded px-1.5 py-1 text-sm font-mono`} {...props}>
                {children}
              </code>
            );
          },
          // Customize other elements to match the app's styling
          h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-3 pb-2 border-b border-gray-600" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-5 mb-2 pb-1 border-b border-gray-700" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
          p: ({node, ...props}) => <p className="my-3 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 my-4 pl-4" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-2 my-4 pl-4" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
        }}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {review}
      </ReactMarkdown>
    </div>
  );
};

export default ReviewOutput;