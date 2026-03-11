import type { MetadataRoute } from 'next'
import { getAllDenialCodes } from '@/lib/db/denial-codes'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getmyadvocate.org'
  const denialCodes = await getAllDenialCodes()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: `${baseUrl}/tools/denial-decoder`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/resources`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ]

  const denialCodeRoutes: MetadataRoute.Sitemap = denialCodes.map(code => ({
    url: `${baseUrl}/denial-codes/${code.code}`,
    lastModified: new Date(code.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...denialCodeRoutes]
}
