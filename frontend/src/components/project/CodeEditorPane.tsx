import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type * as MonacoNS from "monaco-editor";
import { useYjsBinding } from "../../hooks/useYjsBinding";
import type { OnMount } from "@monaco-editor/react";
export type OpenFile = { id: string; name: string; content: string };

export type CodeEditorPaneHandle = {
  getActiveContent: () => string;
  applyResult: (result: string, strategy: "cursor" | "append") => void;
};

const THEME_NAME = "synq-dark";

function defineSynqTheme(monaco: Monaco) {
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "aea69c", fontStyle: "italic" },
      { token: "keyword", foreground: "5dcaa5" },
      { token: "string", foreground: "dad2c1" },
      { token: "number", foreground: "c9c0ad" },
    ],
    colors: {
      "editor.background": "#383330",
      "editor.foreground": "#dad2c1",
      "editorLineNumber.foreground": "#aea69c",
      "editorLineNumber.activeForeground": "#f7f5f0",
      "editor.selectionBackground": "#5dcaa533",
      "editor.inactiveSelectionBackground": "#5dcaa51a",
      "editorCursor.foreground": "#5dcaa5",
      "editorIndentGuide.background": "#3f3a36",
      "editorIndentGuide.activeBackground": "#544d47",
      "editorWidget.background": "#2b2622",
      "editorWidget.border": "#3f3a36",
      "editor.lineHighlightBackground": "#2b262280",
    },
  });
}

const CodeEditorPane = forwardRef<
  CodeEditorPaneHandle,
  {
    projectId: string;
    openFiles: OpenFile[];
    activeFileId: string;
    onSelectTab: (id: string) => void;
    onCloseTab: (id: string) => void;
    onContentChange?: (fileId: string, content: string) => void;
  }
>(
  function CodeEditorPane(
  { projectId, openFiles, activeFileId, onSelectTab, onCloseTab, onContentChange },
  ref
) {
  const activeFile = openFiles.find((f) => f.id === activeFileId);
  const editorRef = useRef<MonacoNS.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const [editorInstance, setEditorInstance] = useState<MonacoNS.editor.IStandaloneCodeEditor | null>(null);
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);

 const handleMount = useCallback<OnMount>(
    (editor, monaco) => {
      editorRef.current = editor as any;
      monacoRef.current = monaco as any;
      defineSynqTheme(monaco);
      monaco.editor.setTheme(THEME_NAME);
      setEditorInstance(editor as any);
      setMonacoInstance(monaco as any);

      editor.getModel()?.onDidChangeContent(() => {
        const currentContent = editor.getValue();
        if (activeFileId && onContentChange) {
          onContentChange(activeFileId, currentContent);
        }
      });
    },
    [activeFileId, onContentChange]
  );

  const handleApplyResult = useCallback((result: string, strategy: "cursor" | "append") => {
    if (!editorInstance) return;
    const model = editorInstance.getModel();
    if (!model) return;

    let range;
    let textToInsert = result;

    if (strategy === "cursor") {
      const position = editorInstance.getPosition();
      if (position) {
        range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };
      }
    }

    if (!range) {
      const lastLine = model.getLineCount();
      const lastCol = model.getLineMaxColumn(lastLine);
      range = { startLineNumber: lastLine, startColumn: lastCol, endLineNumber: lastLine, endColumn: lastCol };
      textToInsert = "\n" + result;
    }

    editorInstance.executeEdits("agent-apply", [{ range, text: textToInsert, forceMoveMarkers: true }]);
    editorInstance.focus();
  }, [editorInstance]);

  useImperativeHandle(
    ref,
    () => ({
      getActiveContent: () => editorInstance?.getValue() ?? activeFile?.content ?? "",
      applyResult: handleApplyResult,
    }),
    [editorInstance, activeFile, handleApplyResult]
  );

  const { isSynced } = useYjsBinding({
    projectId,
    fileId: activeFile?.id,
    seedContent: activeFile?.content ?? "",
    editor: editorInstance,
    monacoNs: monacoInstance,
  });

  return (
    <div className="flex h-full flex-col">
      <div role="tablist" aria-label="Open files" className="flex items-center overflow-x-auto border-b border-hairline bg-canvas">
        {openFiles.map((file) => {
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              className={`group relative flex shrink-0 items-center gap-2 border-r border-hairline px-3.5 py-2 text-[13px] ${
                isActive ? "bg-canvas-soft text-ink" : "text-mute hover:text-body-strong"
              }`}
            >
              <button
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => onSelectTab(file.id)}
                className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
              >
                {file.name}
              </button>
              <button
                type="button"
                aria-label={`Close ${file.name}`}
                onClick={() => onCloseTab(file.id)}
                className="rounded-sm text-mute opacity-0 transition-opacity duration-150 hover:text-ink focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
              >
                ×
              </button>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-glow-teal shadow-[0_0_8px_var(--color-glow-teal)]"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="relative flex-1 overflow-hidden bg-canvas-soft">
        {activeFile ? (
          <>
            <Editor
              key={activeFile.id}
              height="100%"
              path={activeFile.id}
              defaultLanguage="typescript"
              theme={THEME_NAME}
              onMount={handleMount}
              options={{
                fontSize: 13,
                lineHeight: 22,
                fontFamily: "DM Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
              }}
            />
            {!isSynced && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-canvas-soft/60 text-xs text-mute"
              >
                Syncing…
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-mute">
            Select a file to view its contents.
          </div>
        )}
      </div>
    </div>
  );
});

export default CodeEditorPane;