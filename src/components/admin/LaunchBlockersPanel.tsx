type PanelProps = {
  blockers: Array<{ label: string; status: string }>
};

export function LaunchBlockersPanel({ blockers }: PanelProps) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Launch Blockers</h2>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-300">
        {JSON.stringify(blockers, null, 2)}
      </pre>
    </section>
  );
}