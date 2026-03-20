type PanelProps = {
  assets: unknown[]
};

export function MonetizationPanel({ assets }: PanelProps) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Monetization Queue</h2>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-300">
        {JSON.stringify(assets, null, 2)}
      </pre>
    </section>
  );
}