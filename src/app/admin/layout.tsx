import type { ReactNode } from "react";

export const metadata = {
  title: "MyAdvocate Admin",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900">MyAdvocate</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium uppercase tracking-wide">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="/admin" className="text-gray-600 hover:text-gray-900">Dashboard</a>
            <a href="/admin/review" className="text-gray-600 hover:text-gray-900">Review Queue</a>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
