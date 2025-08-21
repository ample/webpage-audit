// pages/api/export.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';

// Helpful instance type for PDFKit
type PDFDoc = InstanceType<typeof PDFDocument>;

type Metrics = {
  ttfbMs: number;
  fcpMs: number;
  speedIndexMs: number;
  lcpMs?: number | null;
  requests: number;
  transferredBytes: number;
  onLoadMs?: number | null;
  fullyLoadedMs?: number | null;
};

type A11yViolationNode = { html?: string; target?: string[]; failureSummary?: string };
type A11yViolation = {
  id: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
  help: string;
  description?: string;
  helpUrl?: string;
  nodes?: A11yViolationNode[];
};

type A11yReport = {
  url: string;
  summary: { violations: number; passes: number; incomplete: number; inapplicable: number };
  violations: A11yViolation[];
  generatedAt: string;
};

type ExportBody = {
  data: {
    testId?: string;
    siteUrl?: string;
    siteTitle?: string;
    runAt?: string;
    summaryUrl?: string;
    jsonUrl?: string;
    metrics: Metrics;
    a11y?: A11yReport | null;
    aiSuggestions?: string[] | null;
    useAiInsights?: boolean;
  };
};

function filenameBase(data: ExportBody['data']) {
  const host = (() => {
    try {
      return data.siteUrl ? new URL(data.siteUrl).host : 'site';
    } catch {
      return 'site';
    }
  })();
  const date = data.runAt ? new Date(data.runAt) : new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  return `lightning-load-${host}-${stamp}`;
}

function drawSectionHeader(doc: PDFDoc, title: string) {
  const x = doc.page.margins.left;
  const y = doc.y + 6;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.save();
  doc.rect(x, y, 6, 18).fill('#0ea5e9'); // left accent bar
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13).text(title, x + 12, y);
  doc.restore();

  doc
    .moveTo(x, y + 22)
    .lineTo(x + width, y + 22)
    .lineWidth(0.5)
    .strokeColor('#e2e8f0')
    .stroke();
  doc.moveDown(1.2);
}

function drawLink(doc: PDFDoc, label: string, href: string) {
  doc.fillColor('#0b6efd').font('Helvetica').fontSize(10).text(label, {
    link: href,
    underline: true,
  });
  doc.fillColor('#0f172a');
}

function drawKeyValueRowsTwoColumns(
  doc: PDFDoc,
  rows: Array<[string, string]>,
  opts?: { gap?: number }
) {
  const startX = doc.page.margins.left;
  const startY = doc.y;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = opts?.gap ?? 24;
  const colWidth = (usableWidth - gap) / 2;

  const leftCount = Math.ceil(rows.length / 2);
  const leftRows = rows.slice(0, leftCount);
  const rightRows = rows.slice(leftCount);

  // Left column
  doc.save();
  let yLeft = startY;
  for (const [k, v] of leftRows) {
    doc
      .fillColor('#334155')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(k + ':', startX, yLeft, { width: colWidth, continued: true });
    doc.fillColor('#0f172a').font('Helvetica').text(' ' + (v || '—'));
    yLeft = doc.y;
  }
  doc.restore();

  // Right column
  doc.save();
  let yRight = startY;
  const rightX = startX + colWidth + gap;
  for (const [k, v] of rightRows) {
    doc
      .fillColor('#334155')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(k + ':', rightX, yRight, { width: colWidth, continued: true });
    doc.fillColor('#0f172a').font('Helvetica').text(' ' + (v || '—'));
    yRight = doc.y;
  }
  doc.restore();

  // Set y to the lower of the two columns and add spacing
  doc.y = Math.max(yLeft, yRight) + 8;
}

function drawBulletedList(doc: PDFDoc, items: string[]) {
  const startX = doc.page.margins.left;
  const bulletIndent = 12;
  for (const s of items) {
    doc.circle(startX + 3, doc.y + 6, 2).fill('#64748b');
    doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text(s, startX + bulletIndent, doc.y - 6, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right - bulletIndent,
    });
    doc.moveDown(0.3);
  }
  doc.moveDown(0.6);
}

function writePdf(res: NextApiResponse, data: ExportBody['data']) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 72, bottom: 72, left: 64, right: 64 }, // generous padding
  });

  // Header
  const title = 'Lightning Load Results';
  const sub = data.siteTitle || (data.siteUrl ? new URL(data.siteUrl).host : 'Website');
  const run = data.runAt ? new Date(data.runAt) : null;

  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(20).text(title);
  doc.moveDown(0.25);
  doc.fillColor('#475569').font('Helvetica').fontSize(12).text(sub);
  if (run) {
    doc.moveDown(0.15);
    doc.fillColor('#64748b').fontSize(10).text(`Run: ${run.toLocaleString()}`);
  }
  doc.moveDown(0.6);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(1)
    .strokeColor('#e2e8f0')
    .stroke();
  doc.moveDown(0.8);

  // Links
  if (data.siteUrl || data.summaryUrl || data.jsonUrl) {
    drawSectionHeader(doc, 'Links');
    if (data.siteUrl) drawLink(doc, data.siteUrl, data.siteUrl);
    if (data.summaryUrl) drawLink(doc, 'WebPageTest report', data.summaryUrl);
    if (data.jsonUrl) drawLink(doc, 'JSON result', data.jsonUrl);
    doc.moveDown(0.6);
  }

  // Performance Metrics (two columns)
  drawSectionHeader(doc, 'Performance Metrics');
  const m = data.metrics;
  const metricRows: Array<[string, string]> = [
    ['TTFB (ms)', String(m.ttfbMs)],
    ['FCP (ms)', String(m.fcpMs)],
    ['LCP (ms)', m.lcpMs == null ? '—' : String(m.lcpMs)],
    ['Speed Index (ms)', String(m.speedIndexMs)],
    ['Requests', String(m.requests)],
    ['Transferred (bytes)', String(m.transferredBytes)],
    ['onLoad (ms)', m.onLoadMs == null ? '—' : String(m.onLoadMs)],
    ['Fully Loaded (ms)', m.fullyLoadedMs == null ? '—' : String(m.fullyLoadedMs)],
  ];
  drawKeyValueRowsTwoColumns(doc, metricRows);

  // AI Performance Recommendations (if present)
  if (data.useAiInsights && Array.isArray(data.aiSuggestions) && data.aiSuggestions.length) {
    drawSectionHeader(doc, 'AI Performance Recommendations');
    drawBulletedList(doc, data.aiSuggestions);
  }

  // Accessibility
  if (data.a11y) {
    drawSectionHeader(doc, 'Accessibility Summary');

    const s = data.a11y.summary;
    const a11yRows: Array<[string, string]> = [
      ['Violations', String(s.violations)],
      ['Incomplete', String(s.incomplete)],
      ['Passes', String(s.passes)],
      ['Inapplicable', String(s.inapplicable)],
    ];
    drawKeyValueRowsTwoColumns(doc, a11yRows);

    const order = { critical: 4, serious: 3, moderate: 2, minor: 1 } as const;
    const top = [...(data.a11y.violations || [])]
      .sort((a, b) => order[b.impact ?? 'minor'] - order[a.impact ?? 'minor'])
      .slice(0, 10);

    if (top.length) {
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Top Accessibility Issues');
      doc.moveDown(0.3);

      top.forEach((v, i) => {
        const impact = v.impact ? ` [${v.impact}]` : '';
        const example = v.nodes?.[0]?.failureSummary || v.nodes?.[0]?.html || '';
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(`${i + 1}. ${v.help}${impact}`);
        if (v.description) doc.fillColor('#334155').font('Helvetica').fontSize(9).text(v.description);
        if (example) doc.fillColor('#111827').font('Helvetica').fontSize(9).text(example);
        if (v.helpUrl) drawLink(doc, String(v.helpUrl), v.helpUrl);
        doc.moveDown(0.4);
      });
    }
  }

  // Headers for download
  const base = filenameBase(data);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${base}.pdf"`);

  doc.pipe(res);
  doc.end();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const body = req.body as ExportBody;
  if (!body || !body.data || !body.data.metrics) {
    return res.status(400).json({ error: 'Missing data payload' });
  }

  writePdf(res, body.data);
}
