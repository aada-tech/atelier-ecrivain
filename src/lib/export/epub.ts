import { strToU8, zipSync, type Zippable } from 'fflate';
import type { Chapter } from '@/lib/doc/types';
import { docToRenderBlocks, orderedFootnotes, type Run } from '@/lib/doc/text';

export interface EpubMeta {
  title: string;
  author: string;
  subtitle?: string;
  language?: string;
  publisher?: string;
  description?: string;
  /** Image de couverture en data URL (JPEG ou PNG). */
  coverDataUrl?: string;
  identifier?: string;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Caractères de contrôle interdits en XML 1.0.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

function runsToXhtml(runs: Run[], chapterIdx: number): string {
  return runs
    .map((r) => {
      if (r.kind === 'break') return '<br/>';
      if (r.kind === 'note') {
        return `<a epub:type="noteref" href="#n${chapterIdx}-${r.number}" id="r${chapterIdx}-${r.number}" class="noteref">${r.number}</a>`;
      }
      let t = escapeXml(r.text);
      if (r.italic) t = `<em>${t}</em>`;
      if (r.bold) t = `<strong>${t}</strong>`;
      return t;
    })
    .join('');
}

function chapterXhtml(c: Chapter, idx: number, lang: string): string {
  const body = docToRenderBlocks(c.doc)
    .map((b) => {
      if (b.type === 'scene-break') return '<hr class="scene"/>';
      const inner = runsToXhtml(b.runs, idx);
      if (b.type === 'h2') return `<h2>${inner}</h2>`;
      if (b.type === 'h3') return `<h3>${inner}</h3>`;
      if (b.type === 'quote') return `<blockquote><p>${inner}</p></blockquote>`;
      return `<p>${inner}</p>`;
    })
    .join('\n');
  const notes = orderedFootnotes(c.doc, c.notes);
  const notesXml = notes.length
    ? `<section epub:type="endnotes" class="notes"><h2 class="notes-title">Notes</h2><ol>${notes
        .map(
          ({ number, note }) =>
            `<li id="n${idx}-${number}" epub:type="endnote"><p>${escapeXml(note.text)} <a href="#r${idx}-${number}">↩</a></p></li>`,
        )
        .join('')}</ol></section>`
    : '';
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head><meta charset="utf-8"/><title>${escapeXml(c.title)}</title><link rel="stylesheet" href="style.css"/></head>
<body><section epub:type="chapter" id="c${idx}"><h1 class="chapter-title"><span class="num">${idx + 1}</span>${escapeXml(c.title)}</h1>
${body}
${notesXml}</section></body></html>`;
}

const CSS = `body{font-family:serif;line-height:1.55;margin:0 5%;hyphens:auto;-webkit-hyphens:auto}
h1.chapter-title{font-weight:normal;text-align:center;margin:3em 0 2em;font-size:1.6em;line-height:1.2}
h1 .num{display:block;font-size:.55em;letter-spacing:.2em;margin-bottom:.6em;color:#b3401f}
p{margin:0;text-indent:1.4em;text-align:justify}
h1+p,h2+p,h3+p,hr+p,blockquote+p{text-indent:0}
blockquote{margin:1em 1.5em;font-style:italic}
blockquote p{text-indent:0}
hr.scene{border:0;text-align:center;margin:1.5em 0}
hr.scene:after{content:"⁂"}
a.noteref{font-size:.7em;vertical-align:super;text-decoration:none}
.notes{margin-top:2em;font-size:.85em;border-top:1px solid #ccc}
.notes li p{text-indent:0}
.cover{margin:0;padding:0;text-align:center}
.cover img{max-width:100%;max-height:100%}`;

/** Génère un EPUB 3 valide (compatible liseuses Kobo, Apple Livres, Kindle via Send-to-Kindle). */
export function buildEpub(chapters: Chapter[], meta: EpubMeta): Uint8Array {
  const lang = meta.language ?? 'fr';
  const id = meta.identifier ?? `urn:uuid:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`;
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const files: Zippable = {
    // Le fichier mimetype doit être le premier et non compressé.
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
    ),
    'OEBPS/style.css': strToU8(CSS),
  };

  let coverItem = '';
  let coverSpine = '';
  let coverMeta = '';
  const cover = meta.coverDataUrl?.match(/^data:(image\/(jpeg|png));base64,(.+)$/);
  if (cover) {
    const ext = cover[2] === 'png' ? 'png' : 'jpg';
    const bin = atob(cover[3]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    files[`OEBPS/cover.${ext}`] = [bytes, { level: 0 }];
    files['OEBPS/cover.xhtml'] = strToU8(
      `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}"><head><title>Couverture</title><link rel="stylesheet" href="style.css"/></head><body class="cover"><img src="cover.${ext}" alt="${escapeXml(meta.title)}"/></body></html>`,
    );
    coverItem = `<item id="cover-img" href="cover.${ext}" media-type="${cover[1]}" properties="cover-image"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`;
    coverSpine = '<itemref idref="cover" linear="no"/>';
    coverMeta = '<meta name="cover" content="cover-img"/>';
  }

  chapters.forEach((c, i) => {
    files[`OEBPS/chap${i + 1}.xhtml`] = strToU8(chapterXhtml(c, i, lang));
  });

  const nav = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}"><head><title>Sommaire</title></head><body><nav epub:type="toc" id="toc"><h1>Sommaire</h1><ol>${chapters
    .map((c, i) => `<li><a href="chap${i + 1}.xhtml">${escapeXml(c.title)}</a></li>`)
    .join('')}</ol></nav></body></html>`;
  files['OEBPS/nav.xhtml'] = strToU8(nav);

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${lang}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${escapeXml(id)}</dc:identifier>
<dc:title>${escapeXml(meta.title)}</dc:title>
<dc:creator>${escapeXml(meta.author)}</dc:creator>
<dc:language>${lang}</dc:language>
${meta.publisher ? `<dc:publisher>${escapeXml(meta.publisher)}</dc:publisher>` : ''}
${meta.description ? `<dc:description>${escapeXml(meta.description)}</dc:description>` : ''}
<meta property="dcterms:modified">${modified}</meta>
${coverMeta}
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
${coverItem}
${chapters.map((_, i) => `<item id="c${i + 1}" href="chap${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine>${coverSpine}${chapters.map((_, i) => `<itemref idref="c${i + 1}"/>`).join('')}</spine>
</package>`;
  files['OEBPS/content.opf'] = strToU8(opf);

  return zipSync(files, { level: 6 });
}
