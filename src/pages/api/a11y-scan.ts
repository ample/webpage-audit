import type { NextApiRequest, NextApiResponse } from 'next';
import { a11yReportsService } from '@/lib/db/services';
import * as cheerio from 'cheerio';

type A11yViolationNode = {
  html?: string;
  target?: string[];
  failureSummary?: string;
};

type A11yImpact = 'minor' | 'moderate' | 'serious' | 'critical';

type A11yViolation = {
  id: string;
  impact?: A11yImpact;
  help: string;
  description?: string;
  helpUrl?: string;
  nodes?: A11yViolationNode[];
};

type A11yReport = {
  url: string;
  summary: {
    violations: number;
    passes: number;
    incomplete: number;
    inapplicable: number;
  };
  violations: A11yViolation[];
  generatedAt: string;
};

export const config = { runtime: 'nodejs' };

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS ?? 60 * 60 * 24 * 7);

/** Static accessibility analyzer - checks HTML without requiring a browser */
class StaticA11yAnalyzer {
  private $: cheerio.CheerioAPI;
  private violations: A11yViolation[] = [];

  constructor(html: string) {
    this.$ = cheerio.load(html);
  }

  analyze(): { violations: A11yViolation[]; summary: A11yReport['summary'] } {
    this.violations = [];

    this.checkImages();
    this.checkHeadings();
    this.checkFormLabels();
    this.checkLinks();
    this.checkPageStructure();
    this.checkARIA();

    const summary = {
      violations: this.violations.length,
      passes: 0, // Static analysis can't easily determine passes
      incomplete: 0,
      inapplicable: 0,
    };

    return { violations: this.violations, summary };
  }

  private addViolation(id: string, impact: A11yImpact, help: string, description: string, elements: unknown[]) {
    const nodes: A11yViolationNode[] = elements.map(el => ({
      html: this.$(el as any).toString(), // eslint-disable-line @typescript-eslint/no-explicit-any
      target: [this.getSelector(el)],
      failureSummary: description,
    }));

    this.violations.push({
      id,
      impact,
      help,
      description,
      helpUrl: `https://dequeuniversity.com/rules/axe/4.4/${id}`,
      nodes,
    });
  }

  private getSelector(element: unknown): string {
    const el = this.$(element as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const tag = (element as { tagName?: string }).tagName?.toLowerCase();
    const id = el.attr('id');
    const className = el.attr('class');

    if (id) return `#${id}`;
    if (className) return `${tag}.${className.split(' ')[0]}`;
    return tag || 'element';
  }

  private checkImages() {
    // Images without alt attributes
    const imagesWithoutAlt = this.$('img:not([alt])').toArray();
    if (imagesWithoutAlt.length > 0) {
      this.addViolation(
        'image-alt',
        'critical',
        'Images must have alternate text',
        'Images must have alternate text that describes the image content',
        imagesWithoutAlt
      );
    }

    // Images with empty alt on non-decorative images
    const imagesWithEmptyAlt = this.$('img[alt=""]').filter((_, el) => {
      const $el = this.$(el);
      const role = $el.attr('role');
      const ariaHidden = $el.attr('aria-hidden');
      // Only flag if not explicitly marked as decorative
      return role !== 'presentation' && ariaHidden !== 'true';
    }).toArray();

    if (imagesWithEmptyAlt.length > 0) {
      this.addViolation(
        'image-alt-empty',
        'serious',
        'Images with empty alt text should be decorative',
        'Images with empty alt="" should have role="presentation" or be genuinely decorative',
        imagesWithEmptyAlt
      );
    }
  }

  private checkHeadings() {
    const headings = this.$('h1, h2, h3, h4, h5, h6').toArray();

    // No h1 on page
    const h1s = this.$('h1').toArray();
    if (h1s.length === 0) {
      this.addViolation(
        'page-has-heading-one',
        'moderate',
        'Page must have a level-one heading',
        'Page should contain at least one h1 element',
        []
      );
    }

    // Multiple h1s
    if (h1s.length > 1) {
      this.addViolation(
        'page-no-duplicate-main',
        'moderate',
        'Page should not have more than one h1',
        'Multiple h1 elements can confuse screen reader users',
        h1s.slice(1)
      );
    }

    // Check heading hierarchy
    let prevLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName?.slice(1) || '1');
      if (prevLevel > 0 && level > prevLevel + 1) {
        this.addViolation(
          'heading-order',
          'moderate',
          'Headings must increase by only one level',
          `Heading level ${level} follows heading level ${prevLevel}, skipping intermediate levels`,
          [heading]
        );
      }
      prevLevel = level;
    });

    // Empty headings
    const emptyHeadings = headings.filter(h => this.$(h).text().trim() === '');
    if (emptyHeadings.length > 0) {
      this.addViolation(
        'empty-heading',
        'serious',
        'Headings must have discernible text',
        'Headings cannot be empty',
        emptyHeadings
      );
    }
  }

  private checkFormLabels() {
    // Form inputs without labels
    const inputs = this.$('input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]), textarea, select').toArray();

    const unlabeledInputs = inputs.filter(input => {
      const $input = this.$(input);
      const id = $input.attr('id');
      const ariaLabel = $input.attr('aria-label');
      const ariaLabelledby = $input.attr('aria-labelledby');

      // Check for label element
      const hasLabel = id && this.$(`label[for="${id}"]`).length > 0;

      return !hasLabel && !ariaLabel && !ariaLabelledby;
    });

    if (unlabeledInputs.length > 0) {
      this.addViolation(
        'label',
        'critical',
        'Form elements must have labels',
        'Form elements must have accessible labels',
        unlabeledInputs
      );
    }
  }

  private checkLinks() {
    // Links without accessible names
    const links = this.$('a[href]').toArray();
    const linksWithoutNames = links.filter(link => {
      const $link = this.$(link);
      const text = $link.text().trim();
      const ariaLabel = $link.attr('aria-label');
      const ariaLabelledby = $link.attr('aria-labelledby');
      const title = $link.attr('title');

      return !text && !ariaLabel && !ariaLabelledby && !title;
    });

    if (linksWithoutNames.length > 0) {
      this.addViolation(
        'link-name',
        'serious',
        'Links must have discernible text',
        'Links must have accessible names that describe their purpose',
        linksWithoutNames
      );
    }

    // Generic link text
    const genericTexts = ['click here', 'read more', 'more', 'here', 'link'];
    const genericLinks = links.filter(link => {
      const text = this.$(link).text().trim().toLowerCase();
      return genericTexts.includes(text);
    });

    if (genericLinks.length > 0) {
      this.addViolation(
        'link-text-generic',
        'moderate',
        'Links should have descriptive text',
        'Avoid generic link text like "click here" or "read more"',
        genericLinks
      );
    }
  }

  private checkPageStructure() {
    // Page must have title
    const title = this.$('title').text().trim();
    if (!title) {
      this.addViolation(
        'document-title',
        'serious',
        'Pages must have titles',
        'Page must have a non-empty title element',
        []
      );
    }

    // Page should have lang attribute
    const htmlLang = this.$('html').attr('lang');
    if (!htmlLang) {
      this.addViolation(
        'html-has-lang',
        'serious',
        'html element must have a lang attribute',
        'The html element must have a lang attribute to identify the page language',
        [this.$('html')[0]]
      );
    }

    // Check for main landmark
    const main = this.$('main, [role="main"]').length;
    if (main === 0) {
      this.addViolation(
        'region',
        'moderate',
        'Page must have a main landmark',
        'Page should contain a main element or role="main"',
        []
      );
    }
  }

  private checkARIA() {
    // aria-hidden on focusable elements
    const hiddenFocusable = this.$('[aria-hidden="true"]').filter('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])').toArray();
    if (hiddenFocusable.length > 0) {
      this.addViolation(
        'aria-hidden-focus',
        'serious',
        'aria-hidden elements should not be focusable',
        'Elements with aria-hidden="true" should not be focusable',
        hiddenFocusable
      );
    }

    // Empty aria-label
    const emptyAriaLabel = this.$('[aria-label=""]').toArray();
    if (emptyAriaLabel.length > 0) {
      this.addViolation(
        'aria-label-empty',
        'serious',
        'aria-label attribute should not be empty',
        'aria-label must have a non-empty value',
        emptyAriaLabel
      );
    }
  }
}


/** Fetch HTML content for static analysis */
async function fetchPageHTML(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebpageAuditBot/1.0; Accessibility Scanner)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout: Failed to fetch page within 10 seconds');
    }
    throw new Error(`Failed to fetch HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/** Generate accessibility report using static HTML analysis */
async function generateA11yReport(url: string): Promise<A11yReport> {
  const html = await fetchPageHTML(url);
  const analyzer = new StaticA11yAnalyzer(html);
  const { violations, summary } = analyzer.analyze();

  return {
    url,
    summary,
    violations,
    generatedAt: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { url } = req.body as { url?: string };
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Invalid url' });
  }

  try {
    // Check for cached report
    const cached = await a11yReportsService.get(url);
    if (cached) {
      return res.status(200).json({ cached: true, report: cached });
    }

    // Generate new report using static HTML analysis
    const report = await generateA11yReport(url);

    // Cache the report
    await a11yReportsService.set(url, report, CACHE_TTL_SECONDS);

    return res.status(200).json({
      cached: false,
      report,
      notice: report.summary.violations === 0 ? undefined : `Found ${report.summary.violations} accessibility issue(s). Note: This is static analysis and may not catch all issues that dynamic testing would find.`
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: `Accessibility analysis failed: ${msg}` });
  }
}
