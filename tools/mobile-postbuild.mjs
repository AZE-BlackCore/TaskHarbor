/**
 * 移动端构建后处理：把 mobile/index.html 提升为 Capacitor 所需的根 index.html
 * 相对资源引用（./assets/...）在提升后依然有效。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '..', 'mobile-dist');
const nested = path.join(dist, 'mobile', 'index.html');
const target = path.join(dist, 'index.html');

if (!fs.existsSync(nested)) {
  console.error('[mobile-postbuild] missing', nested);
  process.exit(1);
}

let html = fs.readFileSync(nested, 'utf8');
html = html.replace(/"\.\/mobile\//g, '"./').replace(/'\.\/mobile\//g, "'./");
fs.writeFileSync(target, html, 'utf8');
fs.rmSync(path.join(dist, 'mobile'), { recursive: true, force: true });
console.log('[mobile-postbuild] index.html ready at mobile-dist/');
