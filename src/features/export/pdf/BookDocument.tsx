import React from 'react';
import { Document, Image, Link, Page, Path, Polygon, StyleSheet, Svg, Text, View, type Styles } from '@react-pdf/renderer';
import type { BookMetadata, CoverConfig, FrontBackMatterSection } from '../types/bookMeta';
import type { ExportSettings, PageFormat } from '../types/exportSettings';
import type { ExportTheme, FontToken } from '../types/theme';
import type { RenderBlock, Run } from '@/lib/doc/text';
import { PageBackgroundFill, ReadabilityScrim, isRenderableImageSrc } from './backgroundFill';
import { face, textFor } from './fonts';

export interface PdfChapter {
  id: string;
  title: string;
  blocks: RenderBlock[];
  footnotes: { number: number; text: string }[];
}

const MM = 2.8346;

/** Formats de page en points PDF (largeur, hauteur). */
export const PAGE_SIZES: Record<PageFormat, [number, number]> = {
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  '6x9in': [432, 648],
  pocket: [311.81, 510.24],
};

interface Ctx {
  theme: ExportTheme;
  settings: ExportSettings;
  meta: BookMetadata;
  size: [number, number];
}

type PdfStyle = Styles[string];

function T({
  token,
  bold,
  italic,
  style,
  children,
}: {
  token: FontToken;
  bold?: boolean;
  italic?: boolean;
  style?: PdfStyle;
  children: string;
}) {
  return <Text style={[face(token, { bold, italic }), style ?? {}]}>{textFor(token, children)}</Text>;
}

const HEART =
  'M10 18C4.5 13.6 1.5 10.6 1.5 6.8 1.5 3.9 3.7 2 6.1 2 7.9 2 9.2 3 10 4.4 10.8 3 12.1 2 13.9 2 16.3 2 18.5 3.9 18.5 6.8 18.5 10.6 15.5 13.6 10 18Z';

/** Fleurons dessinés (repère 20 × 20) : la police embarquée ne contient pas ces glyphes Unicode. */
const ORNAMENTS: Record<string, (color: string) => React.ReactNode> = {
  '❦': (c) => <Path d={HEART} fill={c} />,
  '❧': (c) => <Path d={HEART} fill={c} transform="rotate(-90 10 10)" />,
  '✦': (c) => <Path d="M10 0C10.8 6.5 13.5 9.2 20 10 13.5 10.8 10.8 13.5 10 20 9.2 13.5 6.5 10.8 0 10 6.5 9.2 9.2 6.5 10 0Z" fill={c} />,
  '★': (c) => <Polygon points="10,1 12.4,7.3 19,7.3 13.6,11.4 15.7,18.2 10,14.1 4.3,18.2 6.4,11.4 1,7.3 7.6,7.3" fill={c} />,
  '❖': (c) =>
    ['10,0.5 13,5 10,9.5 7,5', '10,10.5 13,15 10,19.5 7,15', '0.5,10 5,7 9.5,10 5,13', '10.5,10 15,7 19.5,10 15,13'].map((points) => (
      <Polygon key={points} points={points} fill={c} />
    )),
};

function Ornament({ glyph, size, color, style }: { glyph?: string; size: number; color: string; style?: PdfStyle }) {
  const draw = glyph ? ORNAMENTS[glyph] : undefined;
  if (!draw) {
    return <Text style={[face('serif'), { fontSize: size, color, textAlign: 'center', letterSpacing: 4 }, style ?? {}]}>{'* * *'}</Text>;
  }
  return (
    <View style={[{ alignItems: 'center' }, style ?? {}]}>
      <Svg width={size} height={size} viewBox="0 0 20 20">
        {draw(color)}
      </Svg>
    </View>
  );
}

function runsToText(runs: Run[], token: FontToken, accent: string, fontSize: number) {
  return runs.map((r, i) => {
    if (r.kind === 'break') return <Text key={i}>{'\n'}</Text>;
    if (r.kind === 'note') {
      return (
        <Text key={i} style={{ ...face('sans-bold'), fontSize: fontSize * 0.6, color: accent }}>
          {` ${r.number}`}
        </Text>
      );
    }
    return (
      <Text key={i} style={face(token, { bold: r.bold, italic: r.italic })}>
        {textFor(token, r.text)}
      </Text>
    );
  });
}

function RunningHead({ ctx }: { ctx: Ctx }) {
  const { theme, meta } = ctx;
  if (theme.headerStyle === 'none') return null;
  const left = theme.headerStyle === 'author-title-alternating' ? meta.authorName : '';
  return (
    <View
      fixed
      style={{
        position: 'absolute',
        top: 22,
        left: 42,
        right: 42,
        flexDirection: 'row',
        justifyContent: left ? 'space-between' : 'center',
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.ruleLine,
        paddingBottom: 3,
      }}
    >
      {left ? (
        <T token={theme.fonts.folio} italic style={{ fontSize: 7.5, color: theme.colors.accent }}>
          {left}
        </T>
      ) : null}
      <T token={theme.fonts.folio} italic style={{ fontSize: 7.5, color: theme.colors.text, opacity: 0.7 }}>
        {meta.title}
      </T>
    </View>
  );
}

function Folio({ ctx }: { ctx: Ctx }) {
  const { theme } = ctx;
  if (theme.folioStyle === 'none') return null;
  const base = {
    position: 'absolute' as const,
    bottom: 22,
    left: 42,
    right: 42,
    fontSize: 8.5,
    color: theme.colors.text,
    ...face(theme.fonts.folio),
  };
  if (theme.folioStyle === 'centered') {
    return <Text fixed style={{ ...base, textAlign: 'center' }} render={({ pageNumber }) => `${pageNumber}`} />;
  }
  // Coin extérieur : à droite sur les pages impaires, à gauche sur les paires.
  return (
    <>
      <Text fixed style={{ ...base, textAlign: 'right' }} render={({ pageNumber }) => (pageNumber % 2 ? `${pageNumber}` : '')} />
      <Text fixed style={{ ...base, textAlign: 'left' }} render={({ pageNumber }) => (pageNumber % 2 ? '' : `${pageNumber}`)} />
    </>
  );
}

function pagePadding(ctx: Ctx) {
  const p = ctx.settings.page;
  const scale = ctx.size[0] / PAGE_SIZES.A4[0];
  return {
    paddingTop: Math.max(48, p.marginTopMm * MM * Math.max(0.75, scale)),
    paddingBottom: Math.max(48, p.marginBottomMm * MM * Math.max(0.75, scale)),
    paddingLeft: p.marginInsideMm * MM * Math.max(0.7, scale),
    paddingRight: p.marginOutsideMm * MM * Math.max(0.7, scale),
  };
}

function Cover({ ctx, cover }: { ctx: Ctx; cover: CoverConfig }) {
  const { meta, theme, size } = ctx;
  const color = cover.titleColor || '#ffffff';
  const image = cover.mode === 'imported' || cover.mode === 'generated' ? cover.imageUrl || cover.illustrationUrl : undefined;
  const hasImage = isRenderableImageSrc(image);
  const w = size[0];
  return (
    <Page size={size} style={{ padding: 0 }}>
      <View style={{ position: 'relative', width: '100%', height: '100%' }}>
        {hasImage ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image
            src={image as string}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <PageBackgroundFill value={cover.background?.value || theme.colors.accent} gradientId="cover-bg" />
        )}
        {hasImage && !cover.hideTextOverlay && <ReadabilityScrim gradientId="cover-scrim" />}
        {!cover.hideTextOverlay && (
          <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: w * 0.09 }}>
            <View style={{ alignItems: 'center', marginTop: w * 0.1 }}>
              <T token={theme.fonts.heading} style={{ fontSize: w * 0.068, color, textAlign: 'center', lineHeight: 1.15 }}>
                {meta.title}
              </T>
              {meta.subtitle ? (
                <T token={theme.fonts.body} italic style={{ fontSize: w * 0.03, color, textAlign: 'center', marginTop: 14, opacity: 0.9 }}>
                  {meta.subtitle}
                </T>
              ) : null}
            </View>
            <T token={theme.fonts.heading} style={{ fontSize: w * 0.034, color, letterSpacing: 1.5, marginBottom: w * 0.06 }}>
              {(meta.penName || meta.authorName || '').toUpperCase()}
            </T>
          </View>
        )}
      </View>
    </Page>
  );
}

function TitlePage({ ctx }: { ctx: Ctx }) {
  const { meta, theme, size } = ctx;
  const align = theme.titlePageLayout === 'left-aligned' ? 'flex-start' : 'center';
  const textAlign = theme.titlePageLayout === 'left-aligned' ? 'left' : 'center';
  return (
    <Page size={size} style={{ ...pagePadding(ctx), justifyContent: 'space-between', alignItems: align }}>
      <View style={{ alignItems: align, marginTop: size[1] * 0.12, width: '100%' }}>
        <T token={theme.fonts.body} style={{ fontSize: 11, letterSpacing: 2, color: theme.colors.text }}>
          {(meta.penName || meta.authorName || '').toUpperCase()}
        </T>
        <T
          token={theme.fonts.heading}
          style={{ fontSize: size[0] * 0.052, color: theme.colors.accent, marginTop: 18, textAlign, lineHeight: 1.2 }}
        >
          {meta.title}
        </T>
        {meta.subtitle ? (
          <T token={theme.fonts.body} italic style={{ fontSize: 12, color: theme.colors.text, marginTop: 10, textAlign }}>
            {meta.subtitle}
          </T>
        ) : null}
        {theme.ornamentGlyph ? (
          <Ornament glyph={theme.ornamentGlyph} size={14} color={theme.colors.accent} style={{ marginTop: 26 }} />
        ) : null}
      </View>
    </Page>
  );
}

function Epigraph({ ctx }: { ctx: Ctx }) {
  const { meta, theme, size } = ctx;
  return (
    <Page size={size} style={pagePadding(ctx)}>
      <View style={{ position: 'absolute', top: size[1] * 0.3, left: size[0] * 0.25, right: pagePadding(ctx).paddingRight }}>
        <T token={theme.fonts.body} italic style={{ fontSize: 10.5, color: theme.colors.text, lineHeight: 1.5 }}>
          {meta.epigraph ?? ''}
        </T>
      </View>
    </Page>
  );
}

function Dedication({ ctx }: { ctx: Ctx }) {
  const { meta, theme, size } = ctx;
  return (
    <Page size={size} style={{ ...pagePadding(ctx), alignItems: 'flex-end' }}>
      <View style={{ marginTop: size[1] * 0.3, width: '60%' }}>
        <T token={theme.fonts.body} italic style={{ fontSize: 11.5, color: theme.colors.text, textAlign: 'right', lineHeight: 1.6 }}>
          {meta.dedication ?? ''}
        </T>
      </View>
    </Page>
  );
}

function Toc({ ctx, chapters }: { ctx: Ctx; chapters: PdfChapter[] }) {
  const { theme, size } = ctx;
  return (
    <Page size={size} style={pagePadding(ctx)}>
      <T token={theme.fonts.heading} style={{ fontSize: 18, color: theme.colors.text, marginTop: 30, marginBottom: 26 }}>
        Sommaire
      </T>
      {chapters.map((c, i) => (
        <Link key={c.id} src={`#${anchor(c.id)}`} style={{ textDecoration: 'none', marginBottom: 9 }}>
          <View style={{ flexDirection: 'row' }}>
            {ctx.settings.includeChapterNumbers ? (
              <T token={theme.fonts.body} style={{ fontSize: 10.5, width: 28, color: theme.colors.accent }}>{`${i + 1}.`}</T>
            ) : null}
            <T token={theme.fonts.body} style={{ fontSize: 10.5, color: theme.colors.text, flex: 1 }}>
              {c.title}
            </T>
          </View>
        </Link>
      ))}
    </Page>
  );
}

function Section({ ctx, section }: { ctx: Ctx; section: FrontBackMatterSection }) {
  const { theme, settings, size } = ctx;
  return (
    <Page size={size} style={pagePadding(ctx)} wrap>
      <RunningHead ctx={ctx} />
      <T
        token={theme.fonts.heading}
        style={{ fontSize: 16, color: theme.colors.text, marginTop: 40, marginBottom: 22, textAlign: 'center' }}
      >
        {section.title}
      </T>
      {section.content
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <T
            key={i}
            token={theme.fonts.body}
            style={{
              fontSize: settings.page.fontSizePt,
              lineHeight: settings.page.lineHeight,
              color: theme.colors.text,
              textAlign: settings.page.justify ? 'justify' : 'left',
              marginBottom: 6,
            }}
          >
            {p.trim()}
          </T>
        ))}
      <Folio ctx={ctx} />
    </Page>
  );
}

function anchor(id: string) {
  return `ch-${id.replace(/[^a-z0-9]/gi, '')}`;
}

function ChapterPages({ ctx, chapter, index }: { ctx: Ctx; chapter: PdfChapter; index: number }) {
  const { theme, settings, size } = ctx;
  const page = settings.page;
  const centered = theme.titlePageLayout !== 'left-aligned' || theme.chapterOpening === 'centered-number';
  const styles = StyleSheet.create({
    para: {
      fontSize: page.fontSizePt,
      lineHeight: page.lineHeight,
      color: theme.colors.text,
      textAlign: page.justify ? 'justify' : 'left',
      marginBottom: page.firstLineIndentMm > 0 ? 0 : page.fontSizePt * 0.55,
    },
  });
  // Premier paragraphe après un titre : pas d'alinéa (et lettrine en ouverture).
  const firstFlags: boolean[] = [];
  let expectFirst = true;
  for (const b of chapter.blocks) {
    if (b.type === 'h2' || b.type === 'h3') expectFirst = true;
    firstFlags.push(b.type === 'p' && expectFirst);
    if (b.type === 'p') expectFirst = false;
  }
  const openingIndex = chapter.blocks.findIndex((b) => b.type === 'p');

  return (
    <Page size={size} style={pagePadding(ctx)} wrap id={anchor(chapter.id)}>
      <RunningHead ctx={ctx} />
      <View style={{ marginTop: size[1] * 0.08, marginBottom: 28, alignItems: centered ? 'center' : 'flex-start' }} wrap={false}>
        {settings.includeChapterNumbers ? (
          <T token={theme.fonts.heading} style={{ fontSize: 10, letterSpacing: 2.5, color: theme.colors.accent, marginBottom: 8 }}>
            {`CHAPITRE ${index + 1}`}
          </T>
        ) : null}
        <T
          token={theme.fonts.heading}
          style={{ fontSize: page.fontSizePt * 1.75, color: theme.colors.text, textAlign: centered ? 'center' : 'left', lineHeight: 1.25 }}
        >
          {chapter.title}
        </T>
        {theme.chapterOpening === 'ornament' && theme.ornamentGlyph ? (
          <Ornament glyph={theme.ornamentGlyph} size={11} color={theme.colors.accent} style={{ marginTop: 10 }} />
        ) : null}
      </View>

      {chapter.blocks.map((b, i) => {
        if (b.type === 'scene-break') {
          return (
            <Ornament
              key={i}
              glyph={theme.ornamentGlyph}
              size={page.fontSizePt * 0.9}
              color={theme.colors.accent}
              style={{ marginVertical: 10 }}
            />
          );
        }
        if (b.type === 'h2' || b.type === 'h3') {
          return (
            <Text
              key={i}
              minPresenceAhead={40}
              style={[
                face(theme.fonts.heading, { bold: true }),
                { fontSize: page.fontSizePt * (b.type === 'h2' ? 1.25 : 1.05), color: theme.colors.text, marginTop: 14, marginBottom: 8 },
              ]}
            >
              {runsToText(b.runs, theme.fonts.heading, theme.colors.accent, page.fontSizePt)}
            </Text>
          );
        }
        if (b.type === 'quote') {
          return (
            <Text
              key={i}
              style={[
                face(theme.fonts.body, { italic: true }),
                styles.para,
                { marginLeft: 22, marginRight: 12, marginVertical: 6, fontSize: page.fontSizePt * 0.95 },
              ]}
            >
              {runsToText(b.runs, theme.fonts.body, theme.colors.accent, page.fontSizePt)}
            </Text>
          );
        }
        const indent = !firstFlags[i] && page.firstLineIndentMm > 0 ? page.firstLineIndentMm * MM : 0;
        if (i === openingIndex && theme.chapterOpening === 'drop-cap' && b.runs[0]?.kind === 'text') {
          // Ouverture en capitales : une lettrine plus grande que le corps chevauche
          // les lignes suivantes (le moteur de mise en page ne gère pas l'habillage).
          const [first, ...rest] = b.runs;
          const t = first.kind === 'text' ? first.text : '';
          const word = t.match(/^\S+/)?.[0] ?? '';
          return (
            <Text key={i} style={[face(theme.fonts.body), styles.para]}>
              <Text style={[face(theme.fonts.body, { bold: true }), { color: theme.colors.accent, letterSpacing: 0.8 }]}>
                {textFor(theme.fonts.body, word.toLocaleUpperCase('fr-FR'))}
              </Text>
              {runsToText(
                [{ ...first, text: t.slice(word.length) } as Run, ...rest],
                theme.fonts.body,
                theme.colors.accent,
                page.fontSizePt,
              )}
            </Text>
          );
        }
        return (
          <Text key={i} style={[face(theme.fonts.body), styles.para, { textIndent: indent }]}>
            {runsToText(b.runs, theme.fonts.body, theme.colors.accent, page.fontSizePt)}
          </Text>
        );
      })}

      {chapter.footnotes.length > 0 ? (
        <View style={{ marginTop: 18, borderTopWidth: 0.5, borderTopColor: theme.colors.ruleLine, paddingTop: 8 }}>
          {chapter.footnotes.map((n) => (
            <View key={n.number} style={{ flexDirection: 'row', marginBottom: 4 }} wrap={false}>
              <T token="sans-bold" style={{ fontSize: page.fontSizePt * 0.7, color: theme.colors.accent, width: 16 }}>
                {String(n.number)}
              </T>
              <T token={theme.fonts.body} style={{ fontSize: page.fontSizePt * 0.8, color: theme.colors.text, lineHeight: 1.4, flex: 1 }}>
                {n.text}
              </T>
            </View>
          ))}
        </View>
      ) : null}
      <Folio ctx={ctx} />
    </Page>
  );
}

function BackCover({ ctx, cover }: { ctx: Ctx; cover: CoverConfig }) {
  const { meta, theme, size } = ctx;
  const color = cover.titleColor || '#ffffff';
  return (
    <Page size={size} style={{ padding: 0 }}>
      <View style={{ position: 'relative', width: '100%', height: '100%' }}>
        <PageBackgroundFill value={cover.background?.value || theme.colors.accent} gradientId="back-bg" />
        <View style={{ padding: size[0] * 0.12, marginTop: size[1] * 0.14 }}>
          <T token={theme.fonts.body} style={{ fontSize: 10.5, color, lineHeight: 1.6, textAlign: 'justify' }}>
            {meta.backCoverBlurb ?? ''}
          </T>
          {meta.authorBio ? (
            <T token={theme.fonts.body} italic style={{ fontSize: 9, color, lineHeight: 1.5, marginTop: 24, opacity: 0.85 }}>
              {meta.authorBio}
            </T>
          ) : null}
        </View>
      </View>
    </Page>
  );
}

export function BookDocument({
  chapters,
  metadata,
  coverConfig,
  settings,
  theme,
  frontBackSections = [],
}: {
  chapters: PdfChapter[];
  metadata: BookMetadata;
  coverConfig: CoverConfig;
  settings: ExportSettings;
  theme: ExportTheme;
  frontBackSections?: FrontBackMatterSection[];
}) {
  const size = PAGE_SIZES[settings.page.format] ?? PAGE_SIZES.A5;
  const ctx: Ctx = { theme, settings, meta: metadata, size };
  const front = frontBackSections.filter((s) => s.placement === 'front').sort((a, b) => a.order - b.order);
  const back = frontBackSections.filter((s) => s.placement === 'back').sort((a, b) => a.order - b.order);

  return (
    <Document
      title={metadata.title}
      author={metadata.penName || metadata.authorName}
      subject={metadata.subtitle}
      creator="Atelier — L’Atelier de l’Écrivain"
      producer="Atelier"
      language="fr"
    >
      {coverConfig.mode !== 'none' && <Cover ctx={ctx} cover={coverConfig} />}
      <TitlePage ctx={ctx} />
      {metadata.epigraph ? <Epigraph ctx={ctx} /> : null}
      {metadata.dedication ? <Dedication ctx={ctx} /> : null}
      {settings.includeToc && chapters.length > 1 ? <Toc ctx={ctx} chapters={chapters} /> : null}
      {front.map((s) => (
        <Section key={s.id} ctx={ctx} section={s} />
      ))}
      {chapters.map((c, i) => (
        <ChapterPages key={c.id} ctx={ctx} chapter={c} index={i} />
      ))}
      {back.map((s) => (
        <Section key={s.id} ctx={ctx} section={s} />
      ))}
      {coverConfig.mode !== 'none' && metadata.backCoverBlurb ? <BackCover ctx={ctx} cover={coverConfig} /> : null}
    </Document>
  );
}
