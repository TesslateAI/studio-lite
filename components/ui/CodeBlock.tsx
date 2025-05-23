import React from 'react';
import { Highlight, Language } from 'prism-react-renderer';
import { CopyButton } from '../copy-button';

interface CodeBlockProps {
  language?: string;
  value: string;
  className?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'javascript', value, className }) => {
  return (
    <div style={{ position: 'relative', margin: '1.5em 0' }} className={className}>
      <CopyButton
        content={value}
        className="absolute right-4 top-4 z-10"
        variant="secondary"
      />
      {Highlight({
        code: value,
        language: language as Language,
        children: ({ className, style, tokens, getLineProps, getTokenProps }: any) => (
          <pre
            className={className}
            style={{
              ...style,
              borderRadius: '8px',
              fontSize: '1em',
              margin: 0,
              padding: '1.5em',
              background: '#1e1e1e',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            {tokens.map((line: any, i: number) => (
              <div key={i} {...getLineProps({ line, key: i })} style={{ display: 'flex' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '2.5em',
                    userSelect: 'none',
                    background: '#f3f3f3',
                    color: '#888',
                    textAlign: 'right',
                    padding: '0 12px',
                    marginRight: '16px',
                    borderRadius: '8px 0 0 8px',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1 }}>
                  {line.map((token: any, key: number) => (
                    <span key={key} {...getTokenProps({ token, key })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        ),
      })}
    </div>
  );
};

export default CodeBlock; 