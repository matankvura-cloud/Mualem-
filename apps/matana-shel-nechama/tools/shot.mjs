// צילום מסך מהיר: node tools/shot.mjs <url> <out.png> [width]
import { chromium } from "playwright";
(async () => {
  const [url, out, w] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: Number(w || 390), height: 844 }, deviceScaleFactor: 1 });
  await p.goto(url, { waitUntil: "load" });
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})();
