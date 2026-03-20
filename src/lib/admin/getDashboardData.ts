import { getServerSupabase } from "@/lib/supabase/server";

export async function getDashboardData() {
  const supabase = getServerSupabase();

  const [
    { data: contentItems },
    { data: tasks },
    { data: taskRuns },
    { data: packagingAssets },
    { data: metrics },
    { data: variants },
  ] = await Promise.all([
    supabase.from("content_item_rollup").select("*").limit(20),
    supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("task_runs").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("packaging_assets").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("content_metrics").select("*").order("synced_at", { ascending: false }).limit(10),
    supabase
      .from("content_variants")
      .select("id,title,language,channel,format")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const blockers = [
    { label: "trackedExecution", status: "check" },
    { label: "Security Checklist", status: "check" },
    { label: "Stripe test mode", status: "check" },
    { label: "Denial-code dataset", status: "check" },
    { label: "Content validation", status: "check" },
  ];

  return {
    blockers,
    contentItems: contentItems ?? [],
    tasks: tasks ?? [],
    taskRuns: taskRuns ?? [],
    packagingAssets: packagingAssets ?? [],
    metrics: metrics ?? [],
    variants: variants ?? [],
  };
}