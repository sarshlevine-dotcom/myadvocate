import { createPackagingAsset } from "@/app/actions/admin";

export function PackagingAssetForm() {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="mb-4 text-lg font-medium">Create Packaging Asset</h2>
      <form action={createPackagingAsset} className="grid gap-3">
        <input
          name="title_working"
          placeholder="Title working"
          className="rounded-md bg-neutral-950 px-3 py-2"
        />
        <select name="asset_type" className="rounded-md bg-neutral-950 px-3 py-2">
          <option value="toolkit">Toolkit</option>
          <option value="ebook">Ebook</option>
          <option value="bundle">Bundle</option>
          <option value="newsletter_series">Newsletter Series</option>
        </select>
        <input
          name="target_audience"
          placeholder="Target audience"
          className="rounded-md bg-neutral-950 px-3 py-2"
        />
        <textarea
          name="packaging_notes"
          placeholder="Packaging notes"
          className="min-h-[120px] rounded-md bg-neutral-950 px-3 py-2"
        />
        <button type="submit" className="rounded-md border border-neutral-700 px-4 py-2 hover:bg-neutral-800">
          Create Packaging Asset
        </button>
      </form>
    </section>
  );
}