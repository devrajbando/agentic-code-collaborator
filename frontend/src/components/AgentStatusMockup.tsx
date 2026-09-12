import { useEffect, useState } from "react";

type RowState = "running" | "done";

interface Row {
  label: string;
  state: RowState;
  doneText: string;
}

const INITIAL: Row[] = [
  { label: "Checking for issues", state: "running", doneText: "no issues found" },
  { label: "Writing documentation", state: "running", doneText: "docs added" },
  { label: "Suggesting a completion", state: "running", doneText: "suggestion ready" },
];

const SETTLE_DELAYS = [1400, 2200, 3100];
const CYCLE_MS = 6000;

export function AgentStatusMockup() {
  const [rows, setRows] = useState<Row[]>(INITIAL);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const runCycle = () => {
      setRows(INITIAL.map((r) => ({ ...r })));
      INITIAL.forEach((_, i) => {
        timers.push(
          setTimeout(() => {
            setRows((prev) => {
              const next = [...prev];
              next[i] = { ...next[i], state: "done" };
              return next;
            });
          }, SETTLE_DELAYS[i])
        );
      });
    };

    runCycle();
    const interval = setInterval(runCycle, CYCLE_MS);

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="bg-[#302a24] border border-[#453d34] rounded-md overflow-hidden">
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-[#453d34]">
        <span className="w-2.25 h-2.25 rounded-full bg-[#453d34]" />
        <span className="w-2.25 h-2.25rounded-full bg-[#453d34]" />
        <span className="w-2.25 h-2.25 rounded-full bg-[#453d34]" />
        <span className="ml-2 text-xs font-mono text-[#9c8f7d]">session.ts &mdash; 2 collaborators</span>
      </div>

      <div className="p-4 font-mono text-[13px] leading-5 min-h-52.5">
        <div className="text-[#c4b8a4] whitespace-pre">
          <span className="text-[#8fa3c9]">function</span> mergeSort(arr<span className="text-[#8fa3c9]">:</span> number[]) {"{"}
        </div>
        <div className="text-[#c4b8a4] whitespace-pre">
          {"  "}<span className="text-[#8fa3c9]">if</span> (arr.length &lt;= 1) <span className="text-[#8fa3c9]">return</span> arr;
        </div>
        <div className="text-[#c4b8a4] whitespace-pre">
          {"  "}<span className="text-[#8fa3c9]">const</span> mid = Math.floor(arr.length / 2);
          <span className="inline-block w-0.5-[14px] ml-0.5 align-middle bg-[#c4b8a4] animate-[blink_1s_step-end_infinite]" />
        </div>

        <div className="mt-3 space-y-2">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm bg-white/3 border border-[#453d34] font-sans text-[13px]"
              style={{ animation: `rise 0.4s ease forwards ${0.1 + i * 0.8}s`, opacity: 0 }}
            >
              <span
                className={
                  "w-1.75 h-1.75 rounded-full shrink-0 transition-colors " +
                  (row.state === "running" ? "bg-[#c9a24a] animate-[pulse_1s_ease-in-out_infinite]" : "bg-[#6fae8e]")
                }
              />
              <span className="font-medium text-[#f2ede3]">{row.label}</span>
              <span className={"ml-auto transition-colors " + (row.state === "done" ? "text-[#6fae8e]" : "text-[#9c8f7d]")}>
                {row.state === "done" ? row.doneText : "running"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scoped keyframes for the blink/rise/pulse micro-animations above.
          Move these into a global stylesheet (e.g. index.css) once this component
          is wired into the real app shell. */}
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes rise { to { opacity: 1; transform: translateY(0); } from { opacity: 0; transform: translateY(4px); } }
        @keyframes pulse { 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}