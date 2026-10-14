import type { MetadataRoute } from 'next'
import { REGISTRY } from '@/lib/registry'

const BASE = 'https://cred.nshipyard.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/api-docs`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]
  const seriesPages: MetadataRoute.Sitemap = REGISTRY.map((s) => ({
    url: `${BASE}/series/${s.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }))
  return [...staticPages, ...seriesPages]
}
