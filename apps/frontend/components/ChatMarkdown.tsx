'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const assistantComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="list-disc pl-4 mb-2 space-y-1 marker:text-slate-400">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 mb-2 space-y-1 marker:text-slate-500">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h3 className="font-black text-base mt-2 mb-1 text-slate-900">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="font-bold text-sm mt-2 mb-1 text-slate-900">{children}</h4>
  ),
  h3: ({ children }) => (
    <h5 className="font-bold text-sm mt-1.5 mb-0.5 text-slate-900">{children}</h5>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-2.5 text-slate-600 my-2 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary font-bold underline underline-offset-2 hover:text-primary-dark break-all"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /language-/.test(className || '');
    if (isBlock) {
      return (
        <code
          className="block bg-slate-100 text-slate-800 p-2.5 rounded-xl text-xs font-mono overflow-x-auto my-2 border border-slate-200"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded-md text-xs font-mono border border-slate-200/80"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="overflow-x-auto max-w-full my-2">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
      <table className="min-w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-slate-200 px-2 py-1.5 text-left font-bold text-slate-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">{children}</td>
  ),
};

interface ChatMarkdownProps {
  content: string;
  /** User bubbles stay plain text; assistant parses Markdown */
  role: 'user' | 'model';
}

export function ChatMarkdown({ content, role }: ChatMarkdownProps) {
  if (role === 'user') {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  return (
    <div className="text-sm text-slate-800 break-words [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={assistantComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
