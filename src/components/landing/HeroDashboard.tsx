"use client";

/**
 * Static, realistic screenshot of the product's Main Table view (dark).
 * No animation — a clean product shot for the hero.
 */

const GRID = "minmax(0,1fr) 60px 90px 58px 100px 74px";

function Av({ i, c, size = 16 }: { i: string; c: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-[#12141a]"
      style={{ width: size, height: size, backgroundColor: c, fontSize: size * 0.42 }}
    >
      {i}
    </span>
  );
}

function Stack({ people, extra }: { people: [string, string][]; extra?: number }) {
  return (
    <span className="flex items-center -space-x-1.5 bg-[#E8EBEE] rounded-full">
      {people.map(([i, c]) => (
        <Av key={i + c} i={i} c={c} />
      ))}
      {extra ? (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[8px] font-bold text-white/70 ring-2 ring-[#12141a]">
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

function Label({ text, c }: { text: string; c: string }) {
  return (
    <span className="inline-flex h-[15px] items-center rounded-full px-1.5 text-[8.5px] font-semibold text-white" style={{ backgroundColor: c }}>
      {text}
    </span>
  );
}

interface Row {
  task: string;
  owners: [string, string][];
  extra?: number;
  status: [string, string, string]; // label, bg, text
  due?: string;
  dueTone?: "red" | "amber" | "muted";
  labels?: [string, string][];
  priority: [string, string, string];
}

function TableRow({ row }: { row: Row }) {
  const dueColor = row.dueTone === "red" ? "#ff6b7d" : row.dueTone === "amber" ? "#FDBC64" : "#aab0c0";
  return (
    <div className="grid items-stretch border-b border-white/[0.06]" style={{ gridTemplateColumns: GRID, height: 32 }}>
      <div className="flex items-center truncate border-r border-white/[0.06] px-2.5 text-[11px] text-[#dfe2ea]">{row.task}</div>
      <div className="flex items-center justify-center border-r border-white/[0.06]">
        <Stack people={row.owners} extra={row.extra} />
      </div>
      <div className="flex items-center justify-center border-r border-white/[0.06] text-[10px] font-semibold" style={{ backgroundColor: row.status[1], color: row.status[2] }}>
        {row.status[0]}
      </div>
      <div className="flex items-center justify-center border-r border-white/[0.06] text-[10px] font-medium" style={{ color: dueColor }}>
        {row.due ?? "—"}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-0.5 border-r border-white/[0.06] px-1">
        {row.labels?.length ? row.labels.map(([t, c]) => <Label key={t} text={t} c={c} />) : <span className="text-[10px] text-white/25">—</span>}
      </div>
      <div className="flex items-center justify-center text-[10px] font-semibold" style={{ backgroundColor: row.priority[1], color: row.priority[2] }}>
        {row.priority[0]}
      </div>
    </div>
  );
}

function Group({ title, color, rows }: { title: string; color: string; rows: Row[] }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 px-0.5">
        <span className="text-[11.5px] font-bold" style={{ color }}>{title}</span>
        <span className="text-[9.5px] font-medium text-white/30">{rows.length} tasks</span>
      </div>
      <div className="overflow-hidden rounded-md" style={{ borderLeft: `3px solid ${color}` }}>
        <div className="grid items-stretch border-b border-white/[0.06] bg-white/[0.03] text-[8.5px] font-semibold text-white/40" style={{ gridTemplateColumns: GRID, height: 22 }}>
          <div className="flex items-center justify-center border-r border-white/[0.06]">Task</div>
          <div className="flex items-center justify-center border-r border-white/[0.06]">Owner</div>
          <div className="flex items-center justify-center border-r border-white/[0.06]">Status</div>
          <div className="flex items-center justify-center border-r border-white/[0.06]">Due</div>
          <div className="flex items-center justify-center border-r border-white/[0.06]">Labels</div>
          <div className="flex items-center justify-center">Priority</div>
        </div>
        {rows.map((r) => (
          <TableRow key={r.task} row={r} />
        ))}
      </div>
    </div>
  );
}

const EK: [string, string] = ["EK", "#8B5CF6"];
const SA: [string, string] = ["SA", "#10B981"];
const OM: [string, string] = ["OM", "#F59E0B"];
const LF: [string, string] = ["LF", "#E2445C"];
const DC: [string, string] = ["DC", "#4B91F7"];

const NOT_STARTED: [string, string, string] = ["Not Started", "#5b6070", "#fff"];
const WORKING: [string, string, string] = ["Working on it", "#5AC6FC", "#0B3A54"];
const STUCK: [string, string, string] = ["Stuck", "#E2445C", "#fff"];
const REVIEW: [string, string, string] = ["In Review", "#FDBC64", "#4A2E05"];

const P_MED: [string, string, string] = ["Medium", "#4B91F7", "#fff"];
const P_LOW: [string, string, string] = ["Low", "#6b7280", "#fff"];
const P_HIGH: [string, string, string] = ["High", "#F59E0B", "#3F2E10"];
const P_CRIT: [string, string, string] = ["Critical", "#D83A52", "#fff"];

export function HeroDashboard() {
  return (
    <div className="w-full overflow-hidden rounded-[18px] border border-black/10 bg-[#12141a] text-left shadow-2xl ring-1 ring-black/10 dark:border-white/10">
      {/* window bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <div className="ml-2">
          <p className="text-[12px] font-bold leading-none text-white">Product Launch</p>
          <p className="text-[9px] text-white/35">Q3 product launch plan</p>
        </div>
        <span className="ml-auto flex items-center gap-2">
          <span className="rounded-md bg-white/10 px-2 py-1 text-[9px] font-semibold text-white/80">Invite</span>
          <Stack people={[EK, SA, OM, LF]} extra={1} />
        </span>
      </div>
      {/* view tabs */}
      <div className="flex items-center gap-4 border-b border-white/[0.07] px-4">
        <span className="border-b-2 border-[#8B5CF6] py-2 text-[10.5px] font-semibold text-[#8b8bff]">Main table</span>
        <span className="py-2 text-[10.5px] font-medium text-white/40">Kanban</span>
      </div>
      {/* table */}
      <div className="space-y-3.5 p-3.5">
        <Group
          title="To-Do"
          color="#4B91F7"
          rows={[
            { task: "User interview round 1", owners: [SA, DC], status: NOT_STARTED, due: "Jul 1", dueTone: "red", labels: [["Research", "#F59E0B"]], priority: P_MED },
            { task: "Notification service refactor", owners: [EK, SA], extra: 1, status: NOT_STARTED, due: "Tomorrow", dueTone: "amber", labels: [["Backend", "#4B91F7"]], priority: P_MED },
            { task: "Competitor pricing research", owners: [EK, SA], extra: 3, status: NOT_STARTED, due: "Jul 22", labels: [["Research", "#F59E0B"]], priority: P_LOW },
            { task: "Brand color palette update", owners: [EK, SA], status: NOT_STARTED, due: "Jun 28", dueTone: "red", labels: [["Design", "#9D99FF"]], priority: P_LOW },
          ]}
        />
        <Group
          title="In Progress"
          color="#5AC6FC"
          rows={[
            { task: "Fix login flow", owners: [EK, SA], status: WORKING, priority: P_MED },
            { task: "Fix mobile navigation bug", owners: [LF], status: STUCK, due: "Jul 7", dueTone: "red", labels: [["Frontend", "#10B981"], ["Urgent", "#E2445C"]], priority: P_HIGH },
          ]}
        />
        <Group
          title="In Review"
          color="#FDBC64"
          rows={[
            { task: "Implement billing service", owners: [EK, SA], extra: 1, status: REVIEW, due: "Jul 10", dueTone: "red", labels: [["Backend", "#4B91F7"], ["Urgent", "#E2445C"]], priority: P_CRIT },
          ]}
        />
      </div>
    </div>
  );
}
