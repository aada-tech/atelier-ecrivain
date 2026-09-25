'use client';

import { Accordion } from 'radix-ui';
import { Plus } from 'lucide-react';
import { SectionHeading } from './reveal';
import { FAQ_ITEMS } from './faq-data';

export function Faq() {
  return (
    <section id="faq" className="py-28 sm:py-36" aria-labelledby="faq-title">
      <div className="container-page grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading id="faq-title" align="left" eyebrow="Questions" title="Tout ce que vous vous demandez." />
        <Accordion.Root type="single" collapsible className="divide-y divide-white/10 border-y border-white/10">
          {FAQ_ITEMS.map((item) => (
            <Accordion.Item key={item.q} value={item.q}>
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium tracking-tight transition hover:text-ember">
                  {item.q}
                  <Plus className="size-5 shrink-0 text-faint transition-transform duration-300 group-data-[state=open]:rotate-45" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-[15.5px] leading-relaxed text-muted data-[state=closed]:animate-[accordion-up_0.3s_ease-out] data-[state=open]:animate-[accordion-down_0.3s_ease-out]">
                <p className="pr-10 pb-6">{item.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
