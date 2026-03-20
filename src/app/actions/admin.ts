"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";

export async function markSpanishCandidate(contentItemId: string) {
  const supabase = getServerSupabase();

  const { error } = await supabase
    .from("content_items")
    .update({ translation_status: "candidate" })
    .eq("id", contentItemId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createPackagingAsset(formData: FormData) {
  const supabase = getServerSupabase();

  const title = String(formData.get("title_working") ?? "").trim();
  const assetType = String(formData.get("asset_type") ?? "toolkit").trim();
  const targetAudience = String(formData.get("target_audience") ?? "").trim();
  const notes = String(formData.get("packaging_notes") ?? "").trim();

  if (!title) throw new Error("Missing packaging asset title.");

  const { error } = await supabase.from("packaging_assets").insert({
    title_working: title,
    asset_type: assetType,
    target_audience: targetAudience || null,
    packaging_notes: notes || null,
    status: "idea",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createMetricEntry(formData: FormData) {
  const supabase = getServerSupabase();

  const variantId = String(formData.get("variant_id") ?? "").trim();
  const windowType = String(formData.get("window_type") ?? "7d").trim();
  const views = Number(formData.get("views") ?? 0);
  const clicks = Number(formData.get("clicks") ?? 0);
  const signups = Number(formData.get("signups") ?? 0);
  const paidConversions = Number(formData.get("paid_conversions") ?? 0);
  const retentionRate = Number(formData.get("retention_rate") ?? 0);
  const saveRate = Number(formData.get("save_rate") ?? 0);
  const comments = Number(formData.get("comments") ?? 0);
  const shares = Number(formData.get("shares") ?? 0);

  if (!variantId) throw new Error("Missing variant_id.");

  const qualityScore =
    retentionRate * 35 +
    clicks * 2.5 +
    signups * 5 +
    Math.min(views / 10, 10);

  const { error } = await supabase.from("content_metrics").insert({
    variant_id: variantId,
    window_type: windowType,
    views,
    clicks,
    signups,
    paid_conversions: paidConversions,
    retention_rate: retentionRate,
    save_rate: saveRate,
    comments,
    shares,
    quality_score: qualityScore,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}