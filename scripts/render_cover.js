#!/usr/bin/env node
/**
 * render_cover.js — Render cover.html to A4 PDF using Playwright
 * Outputs a 595.3×841.9pt PDF (exact A4 in points)
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const inputHtml = process.argv[2] || '/home/z/my-project/scripts/cover.html';
  const outputPdf = process.argv[3] || '/home/z/my-project/scripts/cover.pdf';

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const fileUrl = 'file://' + path.resolve(inputHtml);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Generate PDF at exact A4 dimensions
  await page.pdf({
    path: outputPdf,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    preferCSSPageSize: true,
  });

  await browser.close();

  const fs = require('fs');
  const sz = fs.statSync(outputPdf).size;
  console.log(`✓ Cover rendered: ${outputPdf}`);
  console.log(`  Size: ${(sz / 1024).toFixed(1)} KB`);
})().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
