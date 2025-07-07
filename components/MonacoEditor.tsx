// components/MonacoEditor.tsx
import Editor from "@monaco-editor/react";
import {
  useActiveCode,
  useSandpack,
  SandpackStack,
  FileTabs,
} from "@codesandbox/sandpack-react";

// A simple utility to map file extensions to Monaco's language identifiers.
const getLanguageOfFile = (filePath: string): string => {
  const extension = filePath.split(".").pop()?.toLowerCase() || "";
  switch (extension) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "css":
      return "css";
    case "html":
      return "html";
    case "vue":
      return "vue";
    case "json":
      return "json";
    default:
      return "plaintext";
  }
};

export function MonacoEditor() {
  const { code, updateCode } = useActiveCode();
  const { sandpack } = useSandpack();
  const language = getLanguageOfFile(sandpack.activeFile);

  return (
    <SandpackStack style={{ height: '90vh', margin: 0 }}>
      {/* This component shows the file tabs */}
      <FileTabs />

      {/* The Monaco Editor container */}
      <div style={{ flex: 1, paddingTop: 8, background: "#1e1e1e" }}>
        <Editor
          width="100%"
          height="90vh"
          // The key is crucial for re-mounting the editor when the active file changes.
          key={sandpack.activeFile}
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => updateCode(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
          }}
        />
      </div>
    </SandpackStack>
  );
}