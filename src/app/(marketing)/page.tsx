import type { Metadata } from 'next';
import { SiteNav } from '@/components/marketing/site-nav';
import { Hero } from '@/components/marketing/hero';
import { Marquee } from '@/components/marketing/marquee';
import { FeatureStory } from '@/components/marketing/feature-story';
import { ReelsSection } from '@/components/marketing/reels-section';
import { Bento } from '@/components/marketing/bento';
import { Privacy } from '@/components/marketing/privacy';
import { Faq } from '@/components/marketing/faq';
import { FAQ_ITEMS } from '@/components/marketing/faq-data';
import { FinalCta } from '@/components/marketing/final-cta';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.fullName,
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web, iOS, Android',
    description: SITE.description,
    url: SITE.url,
    inLanguage: 'fr',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  },
];

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <SiteNav />
      <main id="contenu">
        <Hero />
        <Marquee />
        <FeatureStory />
        <ReelsSection />
        <Bento />
        <Privacy />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
