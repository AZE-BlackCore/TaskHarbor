/**
 * StreamingText - 流式文本渲染组件
 *
 * 支持 Markdown 渲染，streaming 状态时末尾显示光标动画
 */

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export const StreamingText = memo(({ content, isStreaming, className }: StreamingTextProps) => {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 代码块
          code: ({ node, className: codeClass, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClass ?? '');
            const isBlock = !!(node?.position?.start.line !== node?.position?.end.line || match);
            return isBlock ? (
              <pre className="bg-gray-900 dark:bg-gray-950 rounded-lg p-3 overflow-x-auto text-xs my-2">
                <code className={codeClass} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code
                className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          // 链接
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:opacity-80"
            >
              {children}
            </a>
          ),
          // 表格
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border-collapse border border-gray-200 dark:border-gray-700">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">
              {children}
            </td>
          ),
          // 无序列表
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>
          ),
          // 有序列表
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>
          ),
          // 标题
          h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5">{children}</h3>,
          // 段落
          p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
          // 引用块
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary pl-3 my-2 italic text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          // 分隔线
          hr: () => <hr className="my-2 border-gray-200 dark:border-gray-700" />,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="inline-block w-1.5 h-4 bg-primary ml-0.5 align-middle animate-pulse rounded-sm"
          aria-hidden="true"
        />
      )}
    </div>
  );
});

StreamingText.displayName = 'StreamingText';
