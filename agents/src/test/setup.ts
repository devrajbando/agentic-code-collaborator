// agents/src/test/setup.ts — mock global fetch by default; tests override per-case
import { vi } from "vitest";
vi.stubGlobal("fetch", vi.fn());