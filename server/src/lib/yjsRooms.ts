import * as Y from "yjs";

const docs = new Map<string, Y.Doc>();

export function getYDoc(docId: string): Y.Doc {
  let doc = docs.get(docId);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(docId, doc);
  }
  return doc;
}