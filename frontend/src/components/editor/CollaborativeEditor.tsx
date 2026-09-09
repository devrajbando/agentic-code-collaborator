import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useYjsSocket } from "../../hooks/useYjsSocket";

interface Props {
  docId: string;
}

export default function CollaborativeEditor({ docId }: Props) {
  const { yDoc, isReady } = useYjsSocket(docId);

  const handleMount: OnMount = (editor) => {
    if (!yDoc) return;
    const yText = yDoc.getText("monaco");
    new MonacoBinding(yText, editor.getModel()!, new Set([editor]), undefined);
  };

  if (!isReady) return <div>Connecting…</div>;

  return (
    <Editor
      height="90vh"
      defaultLanguage="javascript"
      onMount={handleMount}
      theme="vs-dark"
    />
  );
}