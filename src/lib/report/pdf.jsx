import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {Document, Font, Image, Link, Page, Text, View, renderToBuffer} from '@react-pdf/renderer';
import {LocaleScope} from '../../i18n/LocaleProvider';
import {translate} from '../../i18n/translate';
import {REPORT_CHAPTERS, REPORT_PARTS, ReportDocument} from '../../components/report/ReportDocument';
import {contact} from '../../data/contact';

/**
 * Lays out the paid report as an A4 PDF in the approved design (sindoor red, royal purple, temple gold):
 * cover with Lord Ganesh, a contents page whose titles link to their chapters (and appear as PDF bookmarks),
 * then every chapter running on with a header and page numbers.
 *
 * The chapter text is ReportDocument rendered to HTML, so the web copy and its Hindi translations stay the single
 * source; this file maps that HTML onto react-pdf's page primitives. Devanagari is shaped correctly by fontkit.
 */
const C = {sindoor: '#B3122E', sindoorSoft: '#FBEAEC', sindoorLine: '#E9C3C9', purple: '#4A1F7A', purpleDeep: '#2A1046', gold: '#C99A2E', goldText: '#8C6A12', goldLine: '#E5CF94', cream: '#FFFBF1', lavender: '#F7F2FB', ink: '#241B2F', body: '#3A2F46', muted: '#5E5869', line: '#E6DCEC', zebra: '#FCFAFD'};
const SITE = 'www.numericcvaastu.com';

// Fonts and images live beside this file and are traced into the server build (next.config outputFileTracingIncludes).
const roots = [process.cwd(), path.join(process.cwd(), '..', '..')];
function asset(rel) {
  for (const root of roots) {
    const file = path.join(root, 'src/lib/report', rel);
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`Report asset missing: ${rel}`);
}
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const f = (name) => asset(`fonts/${name}.ttf`);
  Font.register({family: 'Manrope', fonts: [{src: f('Manrope-400')}, {src: f('Manrope-700'), fontWeight: 700}, {src: f('Manrope-800'), fontWeight: 800}]});
  Font.register({family: 'Cormorant', fonts: [{src: f('Cormorant-600'), fontWeight: 600}, {src: f('Cormorant-700'), fontWeight: 700}, {src: f('Cormorant-600i'), fontWeight: 600, fontStyle: 'italic'}]});
  Font.register({family: 'DevaSans', fonts: [{src: f('NotoSansDeva-400')}, {src: f('NotoSansDeva-700'), fontWeight: 700}, {src: f('NotoSansDeva-700'), fontWeight: 800}]});
  Font.register({family: 'DevaSerif', fonts: [{src: f('NotoSerifDeva-600'), fontWeight: 600}, {src: f('NotoSerifDeva-600'), fontWeight: 700}, {src: f('NotoSerifDeva-600'), fontWeight: 600, fontStyle: 'italic'}]});
  Font.registerHyphenationCallback((word) => [word]); // never split words (or Devanagari clusters) across lines
  fontsReady = true;
}

/* ───────── Styles ───────── */
function styles(locale) {
  const hi = locale === 'hi';
  const sans = ['Manrope', 'DevaSans'];
  const serif = ['Cormorant', 'DevaSerif'];
  return {
    hi, sans, serif,
    page: {paddingTop: 64, paddingBottom: 58, paddingHorizontal: 54, fontFamily: sans, fontSize: hi ? 12 : 11.5, color: C.ink},
    // Never set lineHeight on the page: react-pdf re-multiplies an inherited lineHeight on the repeated header and
    // footer for every page until the numbers overflow. Each text style sets its own. react-pdf multiplies the font's
    // natural line height (about 1.37 em for Manrope), so 1.1 gives roughly 1.5 em.
    flow: {},
        header: {position: 'absolute', top: 24, left: 54, right: 54, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.75, borderBottomColor: C.line, paddingBottom: 6, fontSize: 8.5, color: C.muted},
    brand: {color: C.purple, fontWeight: 800, letterSpacing: 1.2},
    footer: {position: 'absolute', bottom: 20, left: 54, right: 54, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.75, borderTopColor: C.line, paddingTop: 6, fontSize: 8.5, color: C.muted},
    pageNo: {color: C.sindoor, fontWeight: 800},
    p: {marginTop: 5, color: C.body, lineHeight: hi ? 1.05 : 1.1},
    h3: {fontSize: hi ? 14.5 : 14, fontWeight: 800, color: C.purple, marginTop: 14, marginBottom: 2, lineHeight: 1.0},
    h4: {fontSize: 12, fontWeight: 800, color: C.ink, marginTop: 10, lineHeight: 1.0},
    h5: {fontSize: 11, fontWeight: 800, color: C.purple, marginTop: 8, lineHeight: 1.0},
    label: {fontSize: 8.5, fontWeight: 800, color: C.sindoor, letterSpacing: 1, marginTop: 4, textTransform: hi ? 'none' : 'uppercase'},
    note: {lineHeight: 1.05, marginTop: 10, backgroundColor: C.lavender, borderLeftWidth: 3, borderLeftColor: C.gold, paddingVertical: 7, paddingHorizontal: 11, fontSize: 10.5, color: C.body},
    when: {marginTop: 2, fontSize: 10, color: C.muted, lineHeight: 1.0},
    link: {color: C.sindoor, textDecoration: 'none', fontWeight: 700},
  };
}

/* ───────── HTML → PDF ───────── */
const INLINE = new Set(['a', 'strong', 'b', 'em', 'i', 'small', 'span', 'br', 'abbr', 'code', 'sup', 'sub']);
const SKIP_CLASSES = ['sr-only'];
const cls = (node) => (node.getAttribute?.('class') || '').split(/\s+/).filter(Boolean);
const has = (node, name) => cls(node).includes(name);
const isText = (node) => node.nodeType === 3;
const tag = (node) => (node.rawTagName || '').toLowerCase();
const clean = (text) => text.replace(/\s+/g, ' ');
const decode = (text) => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, '’').replace(/&nbsp;/g, ' ');
const textOf = (node) => clean(decode(node.text || '')).trim();
const isInline = (node) => isText(node) || INLINE.has(tag(node));
let keySeq = 0;
const k = () => `k${keySeq++}`;

/** Inline content as nested <Text>/<Link> runs. */
function inline(node, s) {
  if (isText(node)) return clean(decode(node.rawText));
  const t = tag(node);
  if (cls(node).some((c) => SKIP_CLASSES.includes(c))) return null;
  if (t === 'br') return '\n';
  const kids = node.childNodes.map((child) => inline(child, s)).filter((x) => x !== null && x !== '');
  if (t === 'a') {
    const href = node.getAttribute('href') || '';
    return <Link key={k()} src={href} style={s.link}>{kids}</Link>;
  }
  if (t === 'strong' || t === 'b') return <Text key={k()} style={{fontWeight: 800, color: C.ink}}>{kids}</Text>;
  if (t === 'em' || t === 'i') return <Text key={k()} style={{color: C.purple, fontWeight: 700}}>{kids}</Text>;
  if (t === 'small') return <Text key={k()} style={{fontSize: 8.5, color: C.muted}}>{kids}</Text>;
  return <Text key={k()}>{kids}</Text>;
}
/** A block's children: inline runs become one <Text>, blocks recurse. */
function children(node, s, textStyle) {
  const out = [];
  let run = [];
  const flush = () => {
    const parts = run.map((child) => inline(child, s)).filter((x) => x !== null && x !== '');
    if (parts.length) {
      if (typeof parts[0] === 'string') parts[0] = parts[0].replace(/^\s+/, '');
      const last = parts.length - 1;
      if (typeof parts[last] === 'string') parts[last] = parts[last].replace(/\s+$/, '');
      if (parts.some((p) => typeof p !== 'string' || p.trim())) out.push(<Text key={k()} style={textStyle}>{parts}</Text>);
    }
    run = [];
  };
  for (const child of node.childNodes) {
    if (isText(child) && !child.rawText.trim() && !run.length) continue;
    if (isInline(child)) run.push(child);
    else { flush(); const b = block(child, s); if (b) out.push(b); }
  }
  flush();
  return out;
}
const withId = (node, element) => {
  const id = node.getAttribute?.('id');
  return id ? <View key={k()} id={id}>{element}</View> : element;
};

function table(node, s) {
  const rows = node.querySelectorAll('tr');
  if (!rows.length) return null;
  const cells = (row) => row.childNodes.filter((c) => ['td', 'th'].includes(tag(c)));
  const columns = Math.max(...rows.map((row) => cells(row).length));
  // Column widths follow how much text each column holds (narrow numbers, wide readings).
  const weight = Array.from({length: columns}, (_, i) => {
    const lengths = rows.map((row) => textOf(cells(row)[i] || {text: ''}).length);
    return Math.min(Math.max(lengths.reduce((a, b) => a + b, 0) / rows.length, 4), 60);
  });
  const total = weight.reduce((a, b) => a + b, 0);
  const width = weight.map((w) => `${Math.max((w / total) * 100, 11)}%`);
  const header = node.querySelector('thead');
  return <View key={k()} style={{marginTop: 10, borderWidth: 0.6, borderColor: C.line, borderRadius: 4}}>
    {rows.map((row, r) => {
      const head = header && header.querySelectorAll('tr').includes(row);
      return <View key={k()} wrap={false} style={{flexDirection: 'row', backgroundColor: head ? C.purple : r % 2 ? C.zebra : '#FFFFFF', borderBottomWidth: r === rows.length - 1 ? 0 : 0.6, borderBottomColor: C.line}}>
        {cells(row).map((cell, i) => <View key={k()} style={{width: width[i], paddingVertical: 5, paddingHorizontal: 7}}>
          {children(cell, s, head ? {lineHeight: 0.95, fontSize: 8.5, fontWeight: 800, color: '#FFFFFF', letterSpacing: s.hi ? 0 : 0.6, textTransform: s.hi ? 'none' : 'uppercase'} : {fontSize: s.hi ? 10.5 : 10, lineHeight: s.hi ? 1.0 : 1.05, color: C.body, fontWeight: tag(cell) === 'th' ? 700 : 400})}
        </View>)}
      </View>;
    })}
  </View>;
}

function list(node, s) {
  const ordered = tag(node) === 'ol';
  const items = node.childNodes.filter((c) => tag(c) === 'li');
  return <View key={k()} style={{marginTop: 6}}>
    {items.map((item, i) => {
      const blocks = item.childNodes.some((c) => !isInline(c) && !(isText(c)));
      return <View key={k()} wrap={blocks} style={{flexDirection: 'row', marginTop: 3}}>
        <Text style={{width: 18, color: ordered ? C.sindoor : C.gold, fontWeight: 800, lineHeight: s.hi ? 1.0 : 1.05}}>{ordered ? `${i + 1}.` : '•'}</Text>
        <View style={{flex: 1}}>{children(item, s, {color: C.body, lineHeight: s.hi ? 1.0 : 1.05})}</View>
      </View>;
    })}
  </View>;
}

function facts(node, s) {
  const items = node.childNodes.filter((c) => tag(c) === 'div');
  return <View key={k()} style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10}}>
    {items.map((item) => <View key={k()} wrap={false} style={{lineHeight: 0.95, width: '49%', marginBottom: 6, backgroundColor: C.lavender, borderRadius: 5, borderLeftWidth: 2.5, borderLeftColor: C.purple, paddingVertical: 6, paddingHorizontal: 9}}>
      <Text style={{fontSize: 8, fontWeight: 800, color: C.muted, letterSpacing: s.hi ? 0 : 0.8, textTransform: s.hi ? 'none' : 'uppercase'}}>{textOf(item.querySelector('dt'))}</Text>
      <Text style={{fontSize: 12.5, fontWeight: 800, color: C.ink, marginTop: 1, lineHeight: 1.35}}>{textOf(item.querySelector('dd'))}</Text>
    </View>)}
  </View>;
}

function calc(node, s) {
  const title = textOf(node.querySelector('h4'));
  const rows = node.childNodes.filter((c) => tag(c) === 'div');
  return <View key={k()} wrap={false} style={{lineHeight: 1.0, marginTop: 12, backgroundColor: C.sindoorSoft, borderWidth: 0.9, borderColor: C.sindoorLine, borderRadius: 7, paddingVertical: 9, paddingHorizontal: 12}}>
    <Text style={{fontSize: 8.5, fontWeight: 800, color: C.sindoor, letterSpacing: s.hi ? 0 : 1.2, textTransform: s.hi ? 'none' : 'uppercase'}}>{title}</Text>
    {rows.map((row) => {const [label, eq] = row.querySelectorAll('p'); return <View key={k()} style={{marginTop: 5}}>
      <Text style={{fontSize: 10, color: C.body}}>{textOf(label)}</Text>
      <Text style={{fontSize: 13, fontWeight: 800, color: C.purpleDeep, marginTop: 1}}>{textOf(eq)}</Text>
    </View>;})}
  </View>;
}

function offer(node, s) {
  const get = (selector) => node.querySelector(selector);
  const a = get('.fr-offer-link a');
  const url = get('.fr-offer-link span');
  const body = node.querySelectorAll('p').find((p) => !cls(p).length);
  return <View key={k()} wrap={false} style={{lineHeight: 1.05, marginTop: 14, backgroundColor: C.cream, borderWidth: 0.9, borderColor: C.goldLine, borderLeftWidth: 3, borderLeftColor: C.gold, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 13}}>
    <Text style={{fontSize: 8.5, fontWeight: 800, color: C.goldText, letterSpacing: s.hi ? 0 : 1.2, textTransform: s.hi ? 'none' : 'uppercase'}}>{textOf(get('.fr-offer-label'))}</Text>
    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 3}}>
      <Text style={{fontSize: 13, fontWeight: 800, color: C.purpleDeep, flex: 1, paddingRight: 10, lineHeight: 1.3}}>{textOf(get('h4'))}</Text>
      <Text style={{fontSize: 13, fontWeight: 800, color: C.sindoor}}>{textOf(get('.fr-offer-price'))}</Text>
    </View>
    {body && <Text style={{marginTop: 4, fontSize: s.hi ? 10.5 : 10.5, color: C.body}}>{textOf(body)}</Text>}
    {a && <Text style={{marginTop: 5, fontSize: 10}}><Link src={a.getAttribute('href')} style={s.link}>{textOf(a)} →</Link><Text style={{color: C.muted}}>  {textOf(url)}</Text></Text>}
  </View>;
}

function grids(node, s) {
  const items = node.childNodes.filter((c) => tag(c) === 'div');
  return <View key={k()} wrap={false} style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
    {items.map((item) => {
      const cells = item.querySelectorAll('.fr-grid > span');
      return <View key={k()} style={{width: '47%'}}>
        <Text style={{...s.h5, marginTop: 4, marginBottom: 5, fontSize: 10, letterSpacing: s.hi ? 0 : 1, textTransform: s.hi ? 'none' : 'uppercase'}}>{textOf(item.querySelector('h3'))}</Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1.4, borderColor: C.purple, borderRadius: 3}}>
          {cells.map((cell) => {
            const planet = textOf(cell.querySelector('small'));
            const digits = clean(cell.childNodes.filter(isText).map((t) => t.rawText).join('')).trim();
            const missing = digits === '·';
            return <View key={k()} style={{width: '33.333%', height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.line, backgroundColor: missing ? C.sindoorSoft : digits.length > 1 ? C.lavender : '#FFFFFF'}}>
              <Text style={{fontSize: 17, fontWeight: 800, color: missing ? C.sindoor : C.purpleDeep, lineHeight: 1.1}}>{missing ? '–' : digits}</Text>
              <Text style={{fontSize: 7.5, color: C.muted, marginTop: 2}}>{planet}</Text>
            </View>;
          })}
        </View>
      </View>;
    })}
  </View>;
}

function boxed(node, s, style) {
  return withId(node, <View key={k()} style={style}>{children(node, s, s.p)}</View>);
}

function block(node, s) {
  if (isText(node)) return null;
  const t = tag(node);
  if (!t || cls(node).some((c) => SKIP_CLASSES.includes(c)) || t === 'caption') return null;
  if (t === 'table') return table(node, s);
  if (t === 'ul' || t === 'ol') return list(node, s);
  if (t === 'dl' && has(node, 'fr-facts')) return facts(node, s);
  if (t === 'dl') return <View key={k()} style={{marginTop: 4}}>{node.childNodes.filter((c) => tag(c) === 'div').map((item) => <Text key={k()} style={{...s.p, marginTop: 3}}><Text style={{fontWeight: 800, color: C.ink}}>{textOf(item.querySelector('dt'))}: </Text>{textOf(item.querySelector('dd'))}</Text>)}</View>;
  if (has(node, 'fr-calc')) return calc(node, s);
  if (has(node, 'fr-offer')) return offer(node, s);
  if (has(node, 'fr-grid-pair')) return grids(node, s);
  if (has(node, 'fr-remedy-box')) return boxed(node, s, {marginTop: 8, backgroundColor: C.lavender, borderLeftWidth: 3, borderLeftColor: C.purple, borderRadius: 5, paddingTop: 2, paddingBottom: 9, paddingHorizontal: 12});
  if (has(node, 'fr-current')) return boxed(node, s, {marginTop: 10, backgroundColor: C.sindoorSoft, borderLeftWidth: 3, borderLeftColor: C.sindoor, borderRadius: 5, paddingBottom: 8, paddingHorizontal: 11});
  // A divider line rather than a border: react-pdf mis-draws top borders on boxes that split across pages.
  if (has(node, 'fr-missing')) return withId(node, <View key={k()} style={{marginTop: 14}}><View style={{height: 1.2, backgroundColor: C.sindoorLine, marginBottom: 2}}/>{children(node, s, s.p)}</View>);
  if (t === 'details') return <View key={k()}>{children(node, s, s.p)}</View>;
  if (t === 'summary') return <Text key={k()} style={s.h5} minPresenceAhead={30}>{textOf(node)}</Text>;
  if (t === 'h3') return withId(node, <Text key={k()} style={s.h3} minPresenceAhead={60}>{children(node, s).flatMap((x) => x.props.children)}</Text>);
  if (t === 'h4') return withId(node, <Text key={k()} style={s.h4} minPresenceAhead={40}>{children(node, s).flatMap((x) => x.props.children)}</Text>);
  if (t === 'h5') return <Text key={k()} style={s.h5} minPresenceAhead={30}>{children(node, s).flatMap((x) => x.props.children)}</Text>;
  if (t === 'p') {
    const style = has(node, 'fr-note') ? s.note : has(node, 'fr-label') ? s.label : has(node, 'fr-when') ? s.when : s.p;
    const kids = children(node, s, style);
    return withId(node, kids.length === 1 ? kids[0] : <View key={k()}>{kids}</View>);
  }
  if (t === 'a') return <Text key={k()} style={{...s.p, marginTop: 4}}>{inline(node, s)}</Text>;
  // section, div, article, aside, li and anything else: a plain container.
  const kids = children(node, s, s.p);
  if (!kids.length) return null;
  const spaced = ['fr-detail-block', 'fr-year', 'fr-period', 'fr-remedy-card', 'fr-relationship-topic', 'fr-love-phase', 'fr-trait'].some((c) => has(node, c));
  return withId(node, <View key={k()} style={spaced ? {marginTop: 6} : undefined}>{kids}</View>);
}

/** One chapter: opener (number, part, title) that never sits alone at a page bottom, then its content. */
function chapter(section, s, t, pages) {
  const number = Number(section.getAttribute('data-chapter'));
  const title = textOf(section.querySelector('h2'));
  const part = REPORT_PARTS.find((p) => p.chapters.includes(number));
  const body = section.childNodes.filter((c) => tag(c) !== 'h2');
  const content = [];
  for (const child of body) {
    if (isInline(child)) { if (textOf(child)) content.push(<Text key={k()} style={s.p}>{inline(child, s)}</Text>); }
    else { const b = block(child, s); if (b) content.push(b); }
  }
  return <View key={k()} id={`fr-chapter-${number}`} bookmark={{title: `${number}. ${title}`, fit: true}} break={number === 1} style={{marginTop: number === 1 ? 0 : 26}}>
    <View minPresenceAhead={150} style={{flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: C.sindoor}}>
      <Text render={({pageNumber}) => { pages[number] = pageNumber; return ''; }} style={{fontSize: 1, width: 1}}/>
      <Text style={{fontSize: 40, fontWeight: 800, color: C.sindoor, lineHeight: 1, marginRight: 12}}>{String(number).padStart(2, '0')}</Text>
      <View style={{flex: 1}}>
        <Text style={{...s.label, marginTop: 0}}>{t(part.title)}</Text>
        <Text style={{fontFamily: s.serif, fontWeight: 600, fontSize: s.hi ? 20 : 24, color: C.purpleDeep, lineHeight: 1.15}}>{title}</Text>
      </View>
    </View>
    {content}
  </View>;
}

function Cover({report, s, t, locale}) {
  const c = report.chart;
  const dob = new Date(`${report.dob}T00:00:00`).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {day: 'numeric', month: 'long', year: 'numeric'});
  const today = new Date(report.generatedAt).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {day: 'numeric', month: 'long', year: 'numeric'});
  const tiles = [[c.mulank, t('Mulank')], [c.bhagyank, t('Bhagyank')], c.kua ? [c.kua, t('Kua')] : [report.names.number, t('Name number')]];
  return <Page size="A4" style={{fontFamily: s.sans, color: C.ink, backgroundColor: '#FFFFFF'}}>
    <View style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 210, backgroundColor: '#FAF6FC'}}/>
    <View style={{position: 'absolute', top: 0, left: 0, right: 0, height: 12, backgroundColor: C.sindoor}}/>
    <View style={{position: 'absolute', top: 15, left: 0, right: 0, height: 2, backgroundColor: C.gold}}/>
    <View style={{position: 'absolute', top: 30, left: 28, right: 28, bottom: 28, borderWidth: 0.9, borderColor: C.gold}}/>
    <View style={{position: 'absolute', top: 35, left: 33, right: 33, bottom: 33, borderWidth: 0.5, borderColor: '#C99A2E80'}}/>
    <View style={{position: 'absolute', top: 52, left: 52, right: 52, bottom: 46, alignItems: 'center', textAlign: 'center'}}>
      <View style={{width: 176, height: 176, borderRadius: 88, borderWidth: 1, borderColor: C.sindoor, alignItems: 'center', justifyContent: 'center', marginTop: 4}}>
        <View style={{width: 166, height: 166, borderRadius: 83, borderWidth: 1.6, borderColor: C.gold, backgroundColor: '#3A1012', alignItems: 'center', justifyContent: 'center'}}>
          <Image src={asset('assets/ganesh-medallion.jpg')} style={{width: 162, height: 162, borderRadius: 81}}/>
        </View>
      </View>
      <Text style={{fontFamily: 'DevaSerif', fontWeight: 600, fontSize: 13, color: C.sindoor, marginTop: 12}}>॥ श्री गणेशाय नमः ॥</Text>
      <Text style={{...s.label, color: C.purple, marginTop: 16, letterSpacing: s.hi ? 0 : 2.2}}>{t('Personal numerology report')}</Text>
      <Text style={{fontFamily: s.serif, fontWeight: 600, fontSize: s.hi ? 28 : 34, color: C.purpleDeep, lineHeight: 1.1, marginTop: 6}}>{t('Your numbers.')}</Text>
      <Text style={{fontFamily: s.serif, fontWeight: 600, fontStyle: 'italic', fontSize: s.hi ? 28 : 34, color: C.sindoor, lineHeight: 1.1}}>{t('Your next steps.')}</Text>
      <Text style={{fontSize: 9.5, color: C.muted, letterSpacing: s.hi ? 0 : 1, textTransform: s.hi ? 'none' : 'uppercase', marginTop: 20}}>{t('Prepared exclusively for')}</Text>
      <Text style={{fontFamily: s.serif, fontWeight: 700, fontSize: 27, color: C.ink, lineHeight: 1.2, marginTop: 3}}>{report.names.name}</Text>
      <Text style={{fontSize: 11, color: C.muted, marginTop: 2}}>{t('Born')} {dob}</Text>
      <View style={{flexDirection: 'row', marginTop: 18}}>
        {tiles.map(([value, label]) => <View key={label} style={{width: 92, marginHorizontal: 7, paddingVertical: 8, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 0.9, borderColor: C.line, borderTopWidth: 3, borderTopColor: C.sindoor, alignItems: 'center'}}>
          <Text style={{fontSize: 26, fontWeight: 800, color: C.sindoor, lineHeight: 1}}>{value}</Text>
          <Text style={{fontSize: 8.5, fontWeight: 800, color: C.purple, marginTop: 4, letterSpacing: s.hi ? 0 : 1, textTransform: s.hi ? 'none' : 'uppercase'}}>{label}</Text>
        </View>)}
      </View>
      <Text style={{marginTop: 18, paddingTop: 9, borderTopWidth: 0.75, borderTopColor: C.goldLine, fontSize: 9.5, color: C.purple, fontWeight: 700, maxWidth: 340}}>{t('19 chapters · Lo Shu and Vedic grids · name and phone · six years ahead · remedies and action plan')}</Text>
      <View style={{marginTop: 'auto', width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 8.5, color: C.muted, textAlign: 'left'}}>
        <View>
          <Image src={asset('assets/logo-nv.png')} style={{width: 34, height: 31, marginBottom: 3}}/>
          <Text style={{color: C.purple, fontWeight: 800}}>NumericcVaastu</Text>
          <Text>Training & Consultancy LLP</Text>
        </View>
        <View style={{alignItems: 'flex-end'}}>
          <Text>{SITE}</Text>
          <Text>{contact.phone}</Text>
          <Text>{t('Report date')}: {today}</Text>
        </View>
      </View>
    </View>
  </Page>;
}

function Contents({s, t, pages}) {
  return <View>
    <Text style={{...s.label, marginTop: 0}}>{t('Contents')}</Text>
    <Text style={{fontFamily: s.serif, fontWeight: 600, fontSize: s.hi ? 22 : 26, color: C.purpleDeep, lineHeight: 1.15, marginTop: 2}}>{t('What is inside your report')}</Text>
    <Text style={{fontSize: 9.5, color: C.muted, marginTop: 4}}>{t('Tap or click any title to go straight to that chapter. The same list appears in your PDF viewer’s bookmarks.')}</Text>
    {REPORT_PARTS.map((part) => <View key={part.title} style={{marginTop: 10}}>
      <Text style={{fontSize: 8, fontWeight: 800, color: C.goldText, letterSpacing: s.hi ? 0 : 1.6, textTransform: s.hi ? 'none' : 'uppercase', marginBottom: 1}}>{t(part.title)}</Text>
      {part.chapters.map((n) => <View key={n} style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 0.6, borderBottomColor: C.line}}>
        <Text style={{width: 24, fontSize: 10, fontWeight: 800, color: C.sindoor, lineHeight: 1.3}}>{String(n).padStart(2, '0')}</Text>
        <Link src={`#fr-chapter-${n}`} style={{flex: 1, fontSize: 11, color: C.ink, textDecoration: 'none', lineHeight: 1.3}}>{t(REPORT_CHAPTERS[n - 1])}</Link>
        <Link src={`#fr-chapter-${n}`} style={{width: 30, textAlign: 'right', fontSize: 10.5, fontWeight: 800, color: C.purple, textDecoration: 'none', lineHeight: 1.3}}>{pages[n] ? String(pages[n]) : ''}</Link>
      </View>)}
    </View>)}
  </View>;
}

function ReportPdf({report, html, locale, pages}) {
  const s = styles(locale);
  const t = (text) => translate(text, locale);
  const root = parse(html);
  const sections = root.querySelectorAll('section.fr-page');
  const dob = new Date(`${report.dob}T00:00:00`).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {day: 'numeric', month: 'long', year: 'numeric'});
  keySeq = 0;
  return <Document title={`${t('Personal numerology report')} · ${report.names.name}`} author="NumericcVaastu" subject={t('Personal numerology report')} creator={SITE} producer="NumericcVaastu" language={locale === 'hi' ? 'hi-IN' : 'en-IN'} pageMode="useOutlines">
    <Cover report={report} s={s} t={t} locale={locale}/>
    <Page size="A4" style={s.page} wrap>
      <View fixed style={s.header}><Text style={s.brand}>NUMERICCVAASTU</Text><Text>{report.names.name} · {dob}</Text></View>
      <View fixed style={s.footer}><Text>{SITE}</Text><Text style={s.pageNo} render={({pageNumber}) => `${pageNumber}`}/></View>
      <View style={s.flow}>
      <View bookmark={{title: t('Contents'), fit: true}}><Contents s={s} t={t} pages={pages}/></View>
      {sections.map((section) => chapter(section, s, t, pages))}
      </View>
    </Page>
  </Document>;
}

/** The report's chapter HTML in the chosen language, exactly as LocalizedContent translates it on the site. */
export function reportHtml(report, locale, currency) {
  return renderToStaticMarkup(<LocaleScope locale={locale}><ReportDocument report={report} locale={locale} currency={currency}/></LocaleScope>);
}

/** Builds the PDF twice: the first pass finds each chapter's page, the second prints those numbers in the contents. */
export async function renderReportPdf(report, {locale = 'en', currency = 'INR'} = {}) {
  registerFonts();
  const html = reportHtml(report, locale, currency);
  const pages = {};
  await renderToBuffer(<ReportPdf report={report} html={html} locale={locale} pages={pages}/>);
  const found = {...pages};
  return renderToBuffer(<ReportPdf report={report} html={html} locale={locale} pages={found}/>);
}
