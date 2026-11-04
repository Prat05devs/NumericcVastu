import fs from 'node:fs';
import path from 'node:path';
import {createFullReport} from '../../../lib/fullReport';
import {asset, assetRoots, renderReportPdf} from '../../../lib/report/pdf';

/**
 * Temporary diagnostics while Hostinger's runtime logs are unavailable: GET /api/report/diag?key=<SITE_BOOKINGS_SECRET>
 * builds a sample report on the server and returns timing or the exact error. Remove once the live report is confirmed.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.SITE_BOOKINGS_SECRET || req.query.key !== process.env.SITE_BOOKINGS_SECRET) return res.status(404).end();
  const info = {node: process.version, cwd: process.cwd(), roots: assetRoots(), assets: {}};
  for (const rel of ['fonts/Manrope-400.ttf', 'fonts/NotoSansDeva-400.ttf', 'assets/ganesh-medallion.jpg']) {
    try { info.assets[rel] = asset(rel); } catch (e) { info.assets[rel] = `MISSING`; }
  }
  try { info.cwdListing = fs.readdirSync(process.cwd()).slice(0, 40); } catch {}
  try {
    const started = Date.now();
    const report = createFullReport({dob: '1976-03-24', gender: 'female', name: 'Diagnostic Check', phone: '9999999999'});
    const pdf = await renderReportPdf(report, {locale: req.query.lang === 'hi' ? 'hi' : 'en'});
    res.status(200).json({ok: true, ms: Date.now() - started, bytes: pdf.length, ...info});
  } catch (error) {
    res.status(500).json({ok: false, error: String(error?.stack || error).split('\n').slice(0, 12), ...info});
  }
}
