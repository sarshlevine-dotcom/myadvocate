import { createMetricEntry } from "@/app/actions/admin";

type Variant = {
  id: string;
  title: string | null;
  language: string;
  channel: string;
  format: string;
};

export function MetricsEntryForm({ variants }: { variants: Variant[] }) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="mb-4 text-lg font-medium">Manual Metrics Entry</h2>
      <form action={createMetricEntry} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span>Variant</span>
          <select name="variant_id" className="rounded-md bg-neutral-950 px-3 py-2">
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {(variant.title ?? "Untitled")} ({variant.language}/{variant.channel}/{variant.format})
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <input name="views" type="number" min="0" placeholder="Views" className="rounded-md bg-neutral-950 px-3 py-2" />
          <input name="clicks" type="number" min="0" placeholder="Clicks" className="rounded-md bg-neutral-950 px-3 py-2" />
          <input name="signups" type="number" min="0" placeholder="Signups" className="rounded-md bg-neutral-950 px-3 py-2" />
          <input name="paid_conversions" type="number" min="0" placeholder="Paid conversions" className="rounded-md bg-neutral-950 px-3 py-2" />
          <input name="retention_rate" type="number" min="0" step="0.01" placeholder="Retention rate" className="rounded-md bg-neutral-950 px-3 py-2" />
          <input name="save_rate" type="number" min="0" step="0.01" placeholder="Save rate" className="rounded-md bg-neutral-950 px-3 py-2" />
          <input name="comments" type="number" min="0" placeholder="Comments" className="rounded-md bg-neutral-950 px-3 py-2" />
          <input name="shares" type="number" min="0" placeholder="Shares" className="rounded-md bg-neutral-950 px-3 py-2" />
        </div>

        <input type="hidden" name="window_type" value="7d" />

        <button type="submit" className="rounded-md border border-neutral-700 px-4 py-2 hover:bg-neutral-800">
          Save Metrics
        </button>
      </form>
    </section>
  );
}