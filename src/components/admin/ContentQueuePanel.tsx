import { markSpanishCandidate } from "@/app/actions/admin";

type ContentItem = {
  id: string;
  slug: string;
  title_working: string;
  pillar: string;
  status: string;
  translation_status: string;
  ebook_candidate: boolean;
  toolkit_candidate: boolean;
  variant_count?: number;
};

export function ContentQueuePanel({ items }: { items: ContentItem[] }) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Content Queue</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.title_working}</p>
                <p className="text-xs text-neutral-400">
                  {item.pillar} · status: {item.status} · translation: {item.translation_status}
                </p>
              </div>
              <form action={markSpanishCandidate.bind(null, item.id)}>
                <button
                  type="submit"
                  className="rounded-md border border-neutral-700 px-3 py-1 text-xs hover:bg-neutral-800"
                >
                  Mark ES Candidate
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}