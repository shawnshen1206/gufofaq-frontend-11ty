// build 後處理：替 dist 的 css / js / i18n 資產加上 content hash 查詢字串（?v=…）。
//
// 為什麼需要：GitHub Pages 對靜態資產送 Cache-Control: max-age=600 且有 CDN 邊緣快取，
// 而本站資產檔名固定（main.css / xxx.js）。改版後在快取失效前，瀏覽器會拿到「新 HTML + 舊 CSS/JS」，
// 造成畫面與程式不同步。加上 content hash 後，內容一變 URL 就變，快取自然失效。
//
// 為什麼用查詢字串而非改檔名：src 的模板保持乾淨（不需 filter / data file，符合 GUIDELINE §2 的語法白名單），
// 全部在建置後處理；hash 只依內容計算，內容沒變就不會產生無謂的 diff。
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const hash = (p) => createHash("md5").update(readFileSync(p)).digest("hex").slice(0, 8);
const stripVer = (s) => s.replace(/\?v=[a-f0-9]{8}/g, "");

// 1) i18n 字典：由 lang-toggle.js 以 fetch 取用，先蓋章再算 js 的 hash（順序不能反）
const i18nPath = join(DIST, "i18n", "en.json");
const langTogglePath = join(DIST, "js", "lang-toggle.js");
if (existsSync(i18nPath) && existsSync(langTogglePath)) {
    const v = hash(i18nPath);
    const src = stripVer(readFileSync(langTogglePath, "utf8"));
    writeFileSync(langTogglePath, src.replace("./i18n/en.json", `./i18n/en.json?v=${v}`));
}

// 2) 算出每支資產的 hash
const versions = new Map();
versions.set("./css/main.css", hash(join(DIST, "css", "main.css")));
for (const f of readdirSync(join(DIST, "js")).filter((f) => f.endsWith(".js"))) {
    versions.set(`./js/${f}`, hash(join(DIST, "js", f)));
}

// 3) 改寫所有 HTML 的資產引用
let touched = 0;
for (const f of readdirSync(DIST).filter((f) => f.endsWith(".html"))) {
    const p = join(DIST, f);
    let html = stripVer(readFileSync(p, "utf8"));
    for (const [asset, v] of versions) {
        html = html.split(`"${asset}"`).join(`"${asset}?v=${v}"`);
    }
    writeFileSync(p, html);
    touched++;
}

console.log(`[hash-assets] 蓋章 ${versions.size} 支資產，改寫 ${touched} 個 HTML`);
