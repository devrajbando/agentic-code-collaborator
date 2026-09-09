import CollaborativeEditor from "../components/editor/CollaborativeEditor";

const DOC_ID = "demo-doc"; // will come from routing/params later

export default function EditorPage() {
  return <CollaborativeEditor docId={DOC_ID} />;
}