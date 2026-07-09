// 把 GUIDELINE.md 的規則寫成測試（Node 內建 node:test，零依賴）。
//
// 為什麼要有這支：規範只寫在 md 裡，靠人或 AI 每次重讀去遵守是不可靠的——
// 最容易腐化的是「枚舉清單」與「跨檔一致性」（元件 js 三方登記、main.scss 的 @use、
// data-i18n key ⇄ en.json、每頁一個 h1…）。這些都能機器驗，就別用眼睛驗。
//
// 執行：`npm test`（需先 build，因為結構檢查跑在 dist/ 的渲染後 HTML 上——標籤是平衡的，
// 不會被 njk 的 {% if %} 干擾）。`npm run check` = lint:css → build → test。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { basename } from "node:path";

const read = (f) => readFileSync(f, "utf8");
const gitFiles = (glob) => execSync(`git ls-files ${glob}`, { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const CJK = /[一-鿿]/;

const srcHtml = gitFiles('"src/**/*.html" "src/*.html"');
const srcScss = gitFiles('"src/**/*.scss"');
const srcJs = gitFiles('"src/**/*.js"');

if (!existsSync("dist")) throw new Error("請先 npm run build（結構檢查跑在 dist/ 上）");
const distHtml = readdirSync("dist").filter((f) => f.endsWith(".html"));

// 逐檔逐行掃描的小工具：回傳 ["檔案:行號  內容"] 的違規清單
function scanLines(files, fn) {
    const hits = [];
    for (const f of files) {
        const lines = read(f).split(/\r?\n/);
        lines.forEach((line, i) => {
            const msg = fn(line, f, i, lines);
            if (msg) hits.push(`${f}:${i + 1}  ${typeof msg === "string" ? msg : line.trim()}`);
        });
    }
    return hits;
}
const fail = (hits) => hits.join("\n");

// 只取「真的在標籤裡」的屬性，避免抓到散文裡引號包住的範例
// （GUIDELINE 自己在 component.html 寫了一句「不要寫行內 style="margin-..."」）
function* tagsOf(html) {
    for (const m of html.matchAll(/<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
        yield { tag: m[1].toLowerCase(), attrs: m[2] || "", raw: m[0] };
    }
}

// ─────────────────────────── §2 模板語法白名單 ───────────────────────────

test("§2 只准 `| safe`，不得有其他 filter / macro / extends / import / block", () => {
    const hits = scanLines(srcHtml, (line) => {
        for (const m of line.matchAll(/\{\{[^}]*\|\s*(\w+)/g)) if (m[1] !== "safe") return `禁用 filter: ${m[0].trim()}`;
        if (/\{%\s*(macro|extends|filter|block|import|set\s+\w+\s*%\})/.test(line) && !/\{%\s*set\s+\w+\s*=/.test(line)) {
            if (/\{%\s*(macro|extends|filter|block|import)\b/.test(line)) return "禁用標籤";
        }
        return null;
    });
    assert.equal(hits.length, 0, `§2 白名單外的語法：\n${fail(hits)}`);
});

test("§2 不得有 _data/ 資料檔（模板不吃 build data）", () => {
    assert.ok(!existsSync("src/_data"), "src/_data 存在");
});

// ─────────────────────────── §3 頁面規則 ───────────────────────────

test("§3-1 走 page-shell 的頁面都要有 titleKey 與 pageHeading", () => {
    const pages = gitFiles('"src/pages/**/*.html"').filter((f) => /^layout: layouts\/page-shell\.html\s*$/m.test(read(f)));
    assert.ok(pages.length > 0, "找不到任何 page-shell 頁面");
    const miss = pages.filter((f) => !/^titleKey:/m.test(read(f)) || !/^pageHeading:/m.test(read(f)));
    assert.equal(miss.length, 0, `缺 titleKey / pageHeading：\n${miss.join("\n")}`);
});

test("§3-1 每一頁恰好一個 <h1>", () => {
    const bad = distHtml
        .map((f) => [f, (read(`dist/${f}`).match(/<h1[\s>]/g) || []).length])
        .filter(([, n]) => n !== 1);
    assert.equal(bad.length, 0, `h1 數量不對：\n${bad.map(([f, n]) => `dist/${f}: ${n} 個`).join("\n")}`);
});

// ─────────────────────────── §4 CSS 規則 ───────────────────────────
// （「零裸 hex / 零裸色彩函式」由 stylelint 把關，見 .stylelintrc.json，不在此重複）

test("§4 文字色要用 --brand-text / --danger-text，不可用填充 token", () => {
    const hits = scanLines(srcScss, (line) =>
        /(?<![-\w])color:\s*var\(--(brand|danger)\)/.test(line) ? "填充 token 當文字色" : null
    );
    assert.equal(hits.length, 0, `深色模式下會讀不到：\n${fail(hits)}`);
});

test("§4-1 不得裸寫 outline: none（要蓋掉必須註記替代焦點環）", () => {
    const hits = scanLines(srcScss, (line) => (/outline:\s*none/.test(line) && !line.includes("//") ? "裸 outline:none" : null));
    assert.equal(hits.length, 0, `會蓋掉全域 :focus-visible 焦點環：\n${fail(hits)}`);
});

test("§4-1 元件不得重寫 box-sizing: border-box（_base.scss 已全域給）", () => {
    const files = srcScss.filter((f) => !/scss\/_(base|normalize)\.scss$/.test(f));
    const hits = scanLines(files, (line) =>
        /box-sizing:\s*border-box/.test(line) && !/-webkit-/.test(line) ? "重複宣告" : null
    );
    assert.equal(hits.length, 0, `多餘宣告：\n${fail(hits)}`);
});

test("§4-1 每個 100vh 都要緊接一行 100dvh fallback", () => {
    const hits = scanLines(srcScss, (line, f, i, lines) => {
        if (!/100vh/.test(line) || /dvh/.test(line) || /^\s*\/\//.test(line)) return null;
        return lines[i + 1] && /100dvh/.test(lines[i + 1]) ? null : "缺 100dvh fallback";
    });
    assert.equal(hits.length, 0, `行動瀏覽器網址列會裁掉內容：\n${fail(hits)}`);
});

// ─────────────────────────── §4 HTML 規則（跑在渲染後的 dist）───────────────────────────

test("§4 不得用 div 假扮控制項（要用真 <button>）", () => {
    const hits = [];
    for (const f of distHtml) for (const t of tagsOf(read(`dist/${f}`)))
        if (t.tag === "div" && /role="button"/.test(t.attrs)) hits.push(`dist/${f}  ${t.raw.slice(0, 70)}`);
    assert.equal(hits.length, 0, `Enter/Space 不會觸發（WCAG 2.1.1）：\n${fail(hits)}`);
});

test("§4 每個 <dialog> 的 aria-labelledby 都要指向存在的 id", () => {
    const hits = [];
    for (const f of distHtml) {
        const html = read(`dist/${f}`);
        const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
        for (const t of tagsOf(html)) {
            if (t.tag !== "dialog") continue;
            const m = t.attrs.match(/aria-labelledby="([^"]+)"/);
            if (!m) hits.push(`dist/${f}  <dialog> 缺 aria-labelledby`);
            else if (!ids.has(m[1])) hits.push(`dist/${f}  aria-labelledby="${m[1]}" 指向不存在的 id`);
        }
    }
    assert.equal(hits.length, 0, fail(hits));
});

test("§4 每個 <img> 都要有 width 與 height（消除版位跳動）", () => {
    const hits = [];
    for (const f of distHtml) for (const t of tagsOf(read(`dist/${f}`)))
        if (t.tag === "img" && !(/\bwidth=/.test(t.attrs) && /\bheight=/.test(t.attrs)))
            hits.push(`dist/${f}  ${t.raw.slice(0, 80)}`);
    assert.equal(hits.length, 0, `缺尺寸（CLS）：\n${fail(hits)}`);
});

test("§4 行內 style 只准三種：<col> 欄寬、JS 切換的 display、資料驅動的執行期尺寸", () => {
    const hits = [];
    for (const f of distHtml) for (const t of tagsOf(read(`dist/${f}`))) {
        const m = t.attrs.match(/\bstyle="([^"]*)"/);
        if (!m) continue;
        const v = m[1].trim();
        const ok =
            (t.tag === "col" && /^(width|min-width)\s*:/.test(v)) ||   // 欄寬
            /^display:\s*(none|block)\s*;?$/.test(v) ||                // JS 切換
            /^width:\s*[\d.]+%\s*;?$/.test(v);                         // 資料驅動（storage-bar）
        if (!ok) hits.push(`dist/${f}  <${t.tag} style="${v.slice(0, 50)}">`);
    }
    assert.equal(hits.length, 0, `顏色/字級/間距不得寫行內：\n${fail(hits)}`);
});

test("§4 不得輸出空屬性（for=\"\" / id=\"\" / name=\"\"）", () => {
    const hits = [];
    for (const f of distHtml) for (const t of tagsOf(read(`dist/${f}`)))
        for (const a of ["for", "id", "name"]) if (new RegExp(`\\b${a}=""`).test(t.attrs)) hits.push(`dist/${f}  <${t.tag} ${a}="">`);
    assert.equal(hits.length, 0, fail(hits));
});

test("§4 phrasing 元素（span / p）內不得放區塊元素（轉 React 會 hydration 錯誤）", () => {
    const VOID = new Set(["img", "input", "br", "hr", "meta", "link", "col", "source", "area", "base", "wbr"]);
    // <a> 是 HTML5 transparent content model —— 包區塊元素合法（如 upload-card 的 <a> 包整張卡），不列入。
    const PHRASING_ONLY = new Set(["span", "p"]);
    const BLOCK = new Set(["div", "p", "ul", "ol", "table", "section", "article", "h1", "h2", "h3", "h4"]);
    const hits = [];
    for (const f of distHtml) {
        // 必須先剝掉 HTML 註解：註解裡若寫了 <p> 之類的範例，會被當成真標籤而一路誤判
        const html = read(`dist/${f}`).replace(/<!--[\s\S]*?-->/g, "");
        const stack = [];
        for (const m of html.matchAll(/<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
            const tag = m[1].toLowerCase();
            const closing = m[0].startsWith("</");
            if (closing) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i] === tag) { stack.length = i; break; } continue; }
            if (m[0].endsWith("/>") || VOID.has(tag)) continue;
            if (BLOCK.has(tag)) {
                const outer = stack.filter((t) => PHRASING_ONLY.has(t)).at(-1);
                if (outer && outer !== tag) hits.push(`dist/${f}  <${outer}> 內含 <${tag}>`);
            }
            stack.push(tag);
        }
    }
    assert.equal(hits.length, 0, fail(hits));
});

test("§4 不得依頁面覆寫元件（.page-xxx .button {}）", () => {
    const hits = scanLines(srcScss, (line) => (/^\s*\.page-[\w-]+\s+\./.test(line) ? "頁面覆寫元件" : null));
    assert.equal(hits.length, 0, fail(hits));
});

// ─────────────────────────── §4-2 i18n ───────────────────────────

test("§4-2 markup 用到的靜態 i18n key 都要在 en.json 有英文", () => {
    const en = JSON.parse(read("src/i18n/en.json"));
    const used = new Map();
    for (const f of srcHtml) {
        read(f).split(/\r?\n/).forEach((line, i) => {
            const note = (k) => { if (!k.includes("{{") && !k.includes("{%")) (used.get(k) ?? used.set(k, []).get(k)).push(`${f}:${i + 1}`); };
            for (const m of line.matchAll(/\bdata-i18n(?:-[a-z-]+)?="([^"]+)"/g)) note(m[1]);
            for (const m of line.matchAll(/\bdata-key-(?:open|close)="([^"]+)"/g)) note(m[1]);
            for (const m of line.matchAll(/^titleKey:\s*([\w.]+)\s*$/g)) note(m[1]);
        });
    }
    const missing = [...used.keys()].filter((k) => en[k] == null);
    assert.equal(missing.length, 0, `英文模式會默默顯示繁中：\n${missing.map((k) => `${k}  ← ${used.get(k)[0]}`).join("\n")}`);
});

test("§4-2 / §5 JS 不得寫死顯示字串（繁中只能當 GufoI18n.t 的 fallback）", () => {
    const hits = scanLines(srcJs, (line, f) => {
        if (/lang-toggle\.js$/.test(f)) return null;              // 語言鈕的「中文」標籤本身
        const code = line.replace(/\/\/.*$/, "");
        if (/\bt\(/.test(code)) return null;                       // t(key, "繁中") 的 fallback
        if (/^\s*var\s+(ZH_[A-Z_]+|zh[A-Z]\w*)\s*=/.test(code)) return null; // 供 t() 用的繁中常數
        const strs = code.match(/"[^"]*"|'[^']*'/g) || [];
        return strs.some((s) => CJK.test(s)) ? "寫死繁中，未走 i18n" : null;
    });
    assert.equal(hits.length, 0, `英文模式一互動就冒繁中：\n${fail(hits)}`);
});

// ─────────────────────────── §5 JS 規則 ───────────────────────────

test("§5 不得有 jQuery 或任何第三方套件", () => {
    const hits = scanLines(srcJs, (line) => {
        const code = line.replace(/\/\/.*$/, "");
        return /\$\(|require\(|^\s*import\s/.test(code) ? "第三方/模組載入" : null;
    });
    assert.equal(hits.length, 0, fail(hits));
});

test("§5 元件 js 三方對齊：實體檔 ⇄ eleventy passthrough ⇄ base.html script", () => {
    const cfg = read("eleventy.config.js");
    const pass = [...cfg.matchAll(/"src\/_includes\/[^"]+\/([\w-]+)\.js":\s*"js\/([\w-]+)\.js"/g)].map((m) => m[2]);
    const tags = [...read("src/_includes/layouts/base.html").matchAll(/src="\.\/js\/([\w-]+)\.js"/g)].map((m) => m[1]);
    const compJs = srcJs.filter((f) => /_includes\/(ui|components)\//.test(f)).map((f) => basename(f, ".js"));

    const notRegistered = compJs.filter((n) => !pass.includes(n));
    const notLoaded = pass.filter((n) => !tags.includes(n));
    const noSource = tags.filter((n) => !pass.includes(n));
    assert.equal(notRegistered.length, 0, `js 存在但沒在 eleventy.config 登記：${notRegistered}`);
    assert.equal(notLoaded.length, 0, `已 passthrough 但 base.html 沒載入：${notLoaded}`);
    assert.equal(noSource.length, 0, `base.html 載入了不存在的 js：${noSource}`);
});

test("§5 dist/js 不得有孤兒（沒被 passthrough 的舊產物）", () => {
    const cfg = read("eleventy.config.js");
    const pass = [...cfg.matchAll(/:\s*"js\/([\w-]+)\.js"/g)].map((m) => m[1]);
    const orphan = existsSync("dist/js")
        ? readdirSync("dist/js").filter((f) => f.endsWith(".js")).map((f) => f.replace(/\.js$/, "")).filter((n) => !pass.includes(n))
        : [];
    assert.equal(orphan.length, 0, `dist 未清乾淨，殘留：${orphan}`);
});

// ─────────────────────────── 跨檔一致性 ───────────────────────────

test("main.scss 有 @use 每一支元件 scss", () => {
    const main = read("src/scss/main.scss");
    const missing = srcScss
        .filter((f) => f.startsWith("src/_includes/"))
        .map((f) => f.replace(/^src\//, "../").replace(/\/_([\w-]+)\.scss$/, "/$1"))
        .filter((p) => !main.includes(p));
    assert.equal(missing.length, 0, `樣式不會被打包進 main.css：\n${missing.join("\n")}`);
});

// GUIDELINE 只放規則（新增頁面/元件時它一個字都不用改）；會變動的清單住 README。
// 枚舉清單最容易腐化，所以由測試盯著 README。
test("README.md 有交代每一個 layout", () => {
    const doc = read("README.md");
    const missing = readdirSync("src/_includes/layouts").filter((f) => f.endsWith(".html") && !doc.includes(f));
    assert.equal(missing.length, 0, `README 沒提到這些 layout：${missing}`);
});

test("GUIDELINE.md 不放會腐化的枚舉（頁數、元件數）", () => {
    const doc = read("GUIDELINE.md");
    const bad = [/全\s*\d+\s*頁/, /目前有\s*\d+\s*個元件/, /\d+\s*個元件/].filter((re) => re.test(doc));
    assert.equal(bad.length, 0, `GUIDELINE 出現了會隨專案變動的數字，應移到 README：${bad}`);
});
