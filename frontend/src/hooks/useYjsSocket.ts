import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { createSocket } from "../lib/socket";

export function useYjsSocket(docId: string) {
  const [isReady, setIsReady] = useState(false);
  const yDocRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;

    const socket = createSocket();
    socket.emit("join-document", docId);

    socket.on("sync-step", (state: number[]) => {
      Y.applyUpdate(yDoc, new Uint8Array(state));
      setIsReady(true);
    });

    socket.on("yjs-update", (update: number[]) => {
      Y.applyUpdate(yDoc, new Uint8Array(update));
    });

    yDoc.on("update", (update: Uint8Array) => {
      socket.emit("yjs-update", { docId, update: Array.from(update) });
    });

    return () => {
      socket.disconnect();
      yDoc.destroy();
    };
  }, [docId]);

  return { yDoc: yDocRef.current, isReady };
}