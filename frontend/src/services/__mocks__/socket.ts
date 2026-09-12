// frontend/src/services/__mocks__/socket.ts — a controllable fake for hook tests
import { vi } from "vitest";
type Handler = (...args: any[]) => void;
const handlers: Record<string, Handler[]> = {};

export const socket = {
  emit: vi.fn(),
  on: vi.fn((event: string, fn: Handler) => {
    (handlers[event] ??= []).push(fn);
  }),
  off: vi.fn((event: string, fn: Handler) => {
    handlers[event] = (handlers[event] ?? []).filter((h) => h !== fn);
  }),
  __trigger: (event: string, payload?: any) => {
    (handlers[event] ?? []).forEach((fn) => fn(payload));
  },
};