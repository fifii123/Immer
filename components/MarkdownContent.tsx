import React from "react";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
// Importuj style dla podświetlania składni
import 'highlight.js/styles/github.css';

const markdownStyles = `
  /* Style dla nagłówków */
  .markdown-content h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #2563eb;
  }
  
  .dark .markdown-content h2 {
    color: #60a5fa;
  }
  
  .markdown-content h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    color: #3b82f6;
  }
  
  .dark .markdown-content h3 {
    color: #93c5fd;
  }
  
  /* Style dla list */
  .markdown-content ul {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    padding-left: 1.5rem;
    list-style-type: disc;
  }
  
  .markdown-content li {
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }
  
  /* Style dla bloków kodu */
  .markdown-content code {
    background-color: #f3f4f6;
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: monospace;
  }
  
  .dark .markdown-content code {
    background-color: #334155;
  }
  
  /* Style dla bloków cytatu */
  .markdown-content blockquote {
    border-left: 4px solid #60a5fa;
    padding-left: 1rem;
    margin-left: 0;
    margin-right: 0;
    font-style: italic;
    background-color: #eff6ff;
    padding: 0.5rem;
    border-radius: 0.25rem;
  }
  
  .dark .markdown-content blockquote {
    background-color: rgba(30, 58, 138, 0.2);
    border-left-color: #3b82f6;
  }
  
  /* Style dla pogrubienia i kursywy */
  .markdown-content strong {
    font-weight: 600;
    color: #1d4ed8;
  }
  
  .dark .markdown-content strong {
    color: #93c5fd;
  }
  
  .markdown-content em {
    color: #4f46e5;
  }
  
  .dark .markdown-content em {
    color: #a5b4fc;
  }
  
  /* Dodatkowe style dla lepszego wyglądu tekstu */
  .markdown-content p {
    margin-bottom: 0.75rem;
    line-height: 1.5;
  }
  
  /* Style dla tabel */
  .markdown-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    font-size: 0.875rem;
  }
  
  .markdown-content th {
    background-color: #f3f4f6;
    border: 1px solid #e5e7eb;
    padding: 0.5rem;
    text-align: left;
    font-weight: 600;
  }
  
  .dark .markdown-content th {
    background-color: #334155;
    border-color: #475569;
  }
  
  .markdown-content td {
    border: 1px solid #e5e7eb;
    padding: 0.5rem;
  }
  
  .dark .markdown-content td {
    border-color: #475569;
  }
  
  /* Style dla wykreśleń */
  .markdown-content del {
    color: #ef4444;
    text-decoration: line-through;
  }
  
  /* Specjalne stylowanie dla bloków kodu z podświetlaniem składni */
  .markdown-content pre {
    background-color: #f8fafc;
    border-radius: 0.375rem;
    padding: 1rem;
    overflow-x: auto;
    margin: 1rem 0;
  }
  
  .dark .markdown-content pre {
    background-color: #1e293b;
  }
  
  /* Listy zadań */
  .markdown-content input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  /* Odstępy między elementami */
  .markdown-content > * + * {
    margin-top: 0.5rem;
  }
`;

interface MarkdownContentProps {
  content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  return (
    <div className="markdown-content text-sm">
      <style dangerouslySetInnerHTML={{ __html: markdownStyles }} />
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // Obsługa tabel i wykreślenia (GFM)
        rehypePlugins={[
          rehypeRaw, // Obsługa surowego HTML
          rehypeSanitize, // Zabezpieczenie przed XSS
          rehypeHighlight // Podświetlanie składni kodu
        ]}
        components={{
          // Niestandardowe renderowanie komponentów
          h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-4 mb-2" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-md font-semibold text-blue-500 dark:text-blue-300 mt-3 mb-2" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2" {...props} />,
          li: ({node, ...props}) => <li className="my-1" {...props} />,
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-blue-400 dark:border-blue-600 pl-4 py-1 my-2 bg-blue-50 dark:bg-blue-900/20 rounded" {...props} />
          ),
          code: ({node, inline, className, children, ...props}) => {
            // Różne style dla inline vs. blok kodu
            if (inline) {
              return (
                <code className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="bg-gray-50 dark:bg-slate-800 rounded-md p-3 my-3 overflow-x-auto">
                <code className="text-sm font-mono leading-relaxed" {...props}>
                  {children}
                </code>
              </div>
            );
          },
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-gray-200 dark:border-slate-700 text-sm" {...props} />
            </div>
          ),
          thead: ({node, ...props}) => <thead className="bg-gray-50 dark:bg-slate-700" {...props} />,
          th: ({node, ...props}) => <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-slate-600 font-medium" {...props} />,
          td: ({node, ...props}) => <td className="px-3 py-2 border-b border-gray-200 dark:border-slate-700" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;