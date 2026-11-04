import {createFullReport} from '../../../lib/fullReport';
import {readPass} from '../../../lib/report/access';
import {renderReportPdf} from '../../../lib/report/pdf';

/**
 * GET /api/report/pdf?pass=…&lang=en|hi — the paid report as a PDF, shown in the browser's viewer (new tab) with
 * its own download button. A Pages Router API route on purpose: the report is rendered with react-dom/server and
 * the client-side translation components, which App Router route handlers (React Server) cannot run.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const access = readPass(req.query.pass);
  if (!access) return res.status(403).send('This report link is not valid or has expired. Please contact NumericcVaastu with your payment ID.');
  const locale = req.query.lang === 'hi' ? 'hi' : 'en';
  try {
    const report = createFullReport(access.inputs);
    const pdf = await renderReportPdf(report, {locale, currency: access.currency});
    const file = `NumericcVaastu-Report-${access.inputs.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Report'}-${locale === 'hi' ? 'Hindi' : 'English'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${file}"`);
    res.setHeader('Content-Length', pdf.length);
    return res.status(200).send(pdf);
  } catch (error) {
    console.error('Report PDF failed', access.orderId, error);
    return res.status(500).send('Your report could not be prepared just now. Please reload this page in a minute.');
  }
}

export const config = {api: {responseLimit: false}};
