import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist-test');
const port = 4174;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (request, response) => {
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);
  const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const candidate = path.resolve(root, relative);
  const safeCandidate = candidate.startsWith(root + path.sep) ? candidate : path.join(root, 'index.html');
  try {
    const data = await fs.readFile(safeCandidate);
    response.writeHead(200, { 'content-type': mime[path.extname(safeCandidate)] || 'application/octet-stream' });
    response.end(data);
  } catch {
    const data = await fs.readFile(path.join(root, 'index.html'));
    response.writeHead(200, { 'content-type': mime['.html'] });
    response.end(data);
  }
});

await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

await page.goto(`http://127.0.0.1:${port}/tutor/libre`, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.resolve('audit-output/hyntibia-local-tutor-desktop.png'), fullPage: true });
const desktop = await page.evaluate(() => ({
  title: document.title,
  headings: [...document.querySelectorAll('h1,h2,h3')].map((e) => e.textContent.trim()).filter(Boolean),
  fonts: [...new Set([...document.querySelectorAll('*')].slice(0, 500).map((e) => getComputedStyle(e).fontFamily))],
  chat: [...document.querySelectorAll('.tut-burbuja')].map((e) => ({
    role: e.className,
    text: e.textContent.trim(),
    width: Math.round(e.getBoundingClientRect().width),
    height: Math.round(e.getBoundingClientRect().height),
    fontSize: getComputedStyle(e).fontSize,
    lineHeight: getComputedStyle(e).lineHeight,
    radius: getComputedStyle(e).borderRadius
  })),
  touchTargets: [...document.querySelectorAll('button,input,a')]
    .map((e) => ({ text: e.textContent.trim().slice(0, 40), rect: e.getBoundingClientRect().toJSON() }))
    .filter(({ rect }) => rect.width > 0 && (rect.width < 44 || rect.height < 44))
    .slice(0, 20)
}));

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: path.resolve('audit-output/hyntibia-local-tutor-mobile.png'), fullPage: true });
const mobile = await page.evaluate(() => ({
  horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
  chatHeight: document.querySelector('.tut-chat')?.getBoundingClientRect().height || 0,
  formWidth: document.querySelector('.tut-chat-form')?.getBoundingClientRect().width || 0,
  bodyTextSize: getComputedStyle(document.body).fontSize
}));

console.log(JSON.stringify({ desktop, mobile, consoleErrors }, null, 2));
await browser.close();
await new Promise((resolve) => server.close(resolve));
