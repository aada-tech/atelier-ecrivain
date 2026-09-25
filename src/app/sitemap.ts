import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/connexion`, lastModified: now, priority: 0.6 },
    { url: `${SITE.url}/confidentialite`, lastModified: now, priority: 0.3 },
    { url: `${SITE.url}/mentions-legales`, lastModified: now, priority: 0.2 },
    { url: `${SITE.url}/conditions`, lastModified: now, priority: 0.2 },
  ];
}
