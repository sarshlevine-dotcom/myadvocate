import { getDashboardData } from "@/lib/admin/getDashboardData";
import { LaunchBlockersPanel } from "@/components/admin/LaunchBlockersPanel";
import { OpenHandsQueuePanel } from "@/components/admin/OpenHandsQueuePanel";
import { ContentQueuePanel } from "@/components/admin/ContentQueuePanel";
import { MonetizationPanel } from "@/components/admin/MonetizationPanel";
import { MetricsPanel } from "@/components/admin/MetricsPanel";
import { MetricsEntryForm } from "@/components/admin/MetricsEntryForm";
import { PackagingAssetForm } from "@/components/admin/PackagingAssetForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Founder Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Internal command center — founder only</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <LaunchBlockersPanel blockers={data.blockers} />
        <OpenHandsQueuePanel tasks={data.tasks} taskRuns={data.taskRuns} />
        <ContentQueuePanel items={data.contentItems} />
        <MonetizationPanel assets={data.packagingAssets} />
        <MetricsPanel metrics={data.metrics} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2 pt-4 border-t border-gray-200">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Log Metrics</h2>
          <MetricsEntryForm variants={data.variants} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">New Packaging Asset</h2>
          <PackagingAssetForm />
        </div>
      </div>
    </div>
  );
}
