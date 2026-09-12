import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";
import { MonacoBinding } from "y-monaco";
import type * as MonacoNS from "monaco-editor";
import { getSocket } from "../services/socket";
import { useCurrentUser } from "../context/CurrentUserContext";

// A small fixed palette so remote cursors are distinguishable without
// wiring real per-user identity yet (no auth/user context reaches the
// frontend today — see ProjectViewPage's "You" placeholder author).
// Pulled from index.css's real @theme tokens: the two retro-futuristic
// accent colors plus body-strong/ink as safe neutrals, so a 3rd+ remote
// cursor doesn't need an invented color outside the brand's palette.
const CURSOR_COLORS = ["#5dcaa5", "#7f77dd", "#cc785c", "#f7f5f0", "#dad2c1"];

function randomLocalUser() {
  const id = Math.random().toString(36).slice(2, 7);
  return {
    name: `Guest-${id}`,
    color: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
  };
}

type BindingArgs = {
  projectId: string;
  fileId: string | undefined;
  /** Seed text used only if this is the first client to ever join an empty doc. */
  seedContent: string;
  editor: MonacoNS.editor.IStandaloneCodeEditor | null;
  monacoNs: typeof MonacoNS | null;
};

/**
 * Binds a Yjs Y.Text (room-keyed as `${projectId}:${fileId}`) to the given
 * Monaco editor's current model via y-monaco's MonacoBinding, including
 * cursor/selection awareness. Only one file should be bound at a time —
 * call this with the *active* file's id; switching `fileId` tears down the
 * previous room binding and joins the new one.
 */
export function useYjsBinding({ projectId, fileId, seedContent, editor, monacoNs }: BindingArgs) {
  const [isSynced, setIsSynced] = useState(false);
  const { user } = useCurrentUser();
  // Guest fallback, generated once and reused for the life of the
  // component — only used pre-login/pre-/me-resolution or if /me fails.
  // A real, logged-in identity (from CurrentUserContext) always wins once
  // available; see the awarenessRef effect below for how that update
  // reaches an already-created Awareness instance without forcing a
  // rebind of the whole Yjs/Monaco binding.
  const guestIdentityRef = useRef(randomLocalUser());
  const awarenessRef = useRef<Awareness | null>(null);

  useEffect(() => {
  if (!fileId || !editor || !monacoNs) return;

  const activeEditor = editor;

    const docId = `${projectId}:${fileId}`;
    const socket = getSocket();
    const yDoc = new Y.Doc();
    const yText = yDoc.getText("monaco");
    const awareness = new Awareness(yDoc);
    awarenessRef.current = awareness;
    awareness.setLocalStateField(
      "user",
      user ? { name: user.name, color: user.color } : guestIdentityRef.current
    );

    let binding: MonacoBinding | null = null;
    setIsSynced(false);

    function handleSyncStep(state: number[]) {
      Y.applyUpdate(yDoc, new Uint8Array(state), "remote");
      // First sync from the server: if the doc is genuinely empty (no one
      // has ever written to this file's Yjs room), seed it from the mock
      // file content so the editor isn't blank. Guarded by length check so
      // concurrent joiners don't double-insert.
      if (yText.length === 0 && seedContent) {
        yDoc.transact(() => {
          if (yText.length === 0) yText.insert(0, seedContent);
        }, "seed");
      }
      setIsSynced(true);

      // Bind Monaco only after the initial state (and any seed) is applied,
      // so the editor never flashes empty-then-populated.
      const model = activeEditor.getModel();
      if (model && !binding) {
        binding = new MonacoBinding(yText, model, new Set([activeEditor]), awareness);
      }
    }

    function handleRemoteUpdate({ docId: incomingDocId, update }: { docId?: string; update: number[] }) {
      // docId filtering guards against a stale update arriving just after
      // a room switch (leave-document is fire-and-forget, not acked).
      if (incomingDocId && incomingDocId !== docId) return;
      Y.applyUpdate(yDoc, new Uint8Array(update), "remote");
    }

    function handleAwarenessUpdate({ docId: incomingDocId, update }: { docId?: string; update: number[] }) {
      if (incomingDocId && incomingDocId !== docId) return;
      applyAwarenessUpdate(awareness, new Uint8Array(update), "remote");
    }

    socket.emit("join-document", docId);
    socket.on("sync-step", handleSyncStep);
    socket.on("yjs-update", handleRemoteUpdate);
    socket.on("awareness-update", handleAwarenessUpdate);

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return; // don't echo back what we just applied
      socket.emit("yjs-update", { docId, update: Array.from(update) });
    };
    yDoc.on("update", onDocUpdate);

    const onAwarenessChange = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changed = [...added, ...updated, ...removed];
      const update = encodeAwarenessUpdate(awareness, changed);
      socket.emit("awareness-update", { docId, update: Array.from(update) });
    };
    awareness.on("update", onAwarenessChange);

    return () => {
      socket.off("sync-step", handleSyncStep);
      socket.off("yjs-update", handleRemoteUpdate);
      socket.off("awareness-update", handleAwarenessUpdate);
      socket.emit("leave-document", docId);

      binding?.destroy();
      awareness.destroy();
      awarenessRef.current = null;
      yDoc.destroy();
      setIsSynced(false);
    };
    // seedContent intentionally omitted: it should only apply on the very
    // first join for a given fileId, not re-fire if the mock content object
    // identity happens to change. `user` is also intentionally omitted here
    // — rebinding the whole Yjs room on every identity change would be
    // disruptive; the effect below pushes identity updates into the
    // already-live Awareness instance instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, fileId, editor, monacoNs]);

  // Handles the common case where the room binds before GET /me resolves
  // (the fetch in CurrentUserProvider is async, the Yjs room doesn't wait
  // on it): once a real user becomes available, push it into whichever
  // Awareness instance is currently live so remote peers see the switch
  // from "Guest-xxxxx" to the real name/color without a rebind.
  useEffect(() => {
    if (user && awarenessRef.current) {
      awarenessRef.current.setLocalStateField("user", { name: user.name, color: user.color });
    }
  }, [user]);

  return { isSynced };
}