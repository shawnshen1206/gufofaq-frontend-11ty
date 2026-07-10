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
    const pages = gitFiles('"src/pages/**/*.html"').filter((f) => /^layout: layouts\/page-shell\/page-shell\.html\s*$/m.test(read(f)));
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
    // 填充族（含 -hover 變體）為了襯白字而壓深，拿來當文字色在深色模式讀不到。
    const FILL = "brand|danger|success|info|warning|accent-orange|accent-teal";
    const re = new RegExp(String.raw`(?<![-\w])color:\s*var\(--(?:${FILL})(?:-hover)?\)`);
    const hits = scanLines(srcScss, (line) => (re.test(line) ? "填充 token 當文字色" : null));
    assert.equal(hits.length, 0, `深色模式下會讀不到：\n${fail(hits)}`);
});

test("§1-2 頁面不得手寫與既有 modal 元件同 id 的 <dialog>（元件只有一份正本）", () => {
    // 一個 <dialog id> 是一個完整單位。頁面複製一份會得到兩份會分岔的正本
    // （曾經：5-2-1 的 intentionModal、1-2-1 的 deleteModal 各自與元件的 i18n key 走鐘）。
    const dialogIds = (html) => [...html.matchAll(/<dialog[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    const owned = new Map(); // dialog id -> 元件
    for (const { bucket, name, path } of componentDirs) {
        const html = `${path}/${name}.html`;
        if (!existsSync(html)) continue;
        for (const id of dialogIds(read(html))) owned.set(id, `${bucket}/${name}`);
    }
    const hits = [];
    for (const p of srcHtml.filter((f) => !f.includes("_includes")))
        for (const id of dialogIds(read(p)))
            if (owned.has(id)) hits.push(`${p}  <dialog id="${id}"> 已有元件 ${owned.get(id)} —— 要用就 {% include %}`);
    assert.equal(hits.length, 0, fail(hits));
});

test("§4-1 不得裸寫 outline: none（要蓋掉必須註記替代焦點環）", () => {
    const hits = scanLines(srcScss, (line) => (/outline:\s*none/.test(line) && !line.includes("//") ? "裸 outline:none" : null));
    assert.equal(hits.length, 0, `會蓋掉全域 :focus-visible 焦點環：\n${fail(hits)}`);
});

test("§4-1 元件不得重寫 box-sizing: border-box（_base.scss 已全域給）", () => {
    const files = srcScss.filter((f) => !/scss\/_(base|normalize)\.scss$/.test(f));
    // 含 vendor prefix：-webkit-box-sizing 一樣是重寫（曾經放行，讓 ui/switch 漏了兩年）
    const hits = scanLines(files, (line) =>
        /(?:-webkit-|-moz-|-ms-)?box-sizing:\s*border-box/.test(line) ? "重複宣告" : null
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

test("§4 不得輸出空屬性（for=\"\" / id=\"\" / name=\"\" / href=\"\"）", () => {
    const hits = [];
    for (const f of distHtml) for (const t of tagsOf(read(`dist/${f}`)))
        for (const a of ["for", "id", "name", "href"]) if (new RegExp(`\\b${a}=""`).test(t.attrs)) hits.push(`dist/${f}  <${t.tag} ${a}="">`);
    assert.equal(hits.length, 0, fail(hits));
});

test("§4 phrasing 元素（span / p / button）內不得放區塊元素（轉 React 會 hydration 錯誤）", () => {
    const VOID = new Set(["img", "input", "br", "hr", "meta", "link", "col", "source", "area", "base", "wbr"]);
    // <a> 是 HTML5 transparent content model —— 包區塊元素合法（如 upload-card 的 <a> 包整張卡），不列入。
    // <button> 只吃 phrasing content：把 div 假扮的控制項改成真 button 時，內容也要一起換成 span
    // （upload-box 就這樣把非法巢狀從 div[role] 換成 button>div）。
    const PHRASING_ONLY = new Set(["span", "p", "button"]);
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
            for (const m of line.matchAll(/\bdata-placeholder-key="([^"]+)"/g)) note(m[1]);
            for (const m of line.matchAll(/^titleKey:\s*([\w.]+)\s*$/g)) note(m[1]);
        });
    }
    // 元件 js 直接呼叫 GufoI18n.t("key", "繁中") 的 key，靜態 markup 掃不到。
    // 跳過 lang-toggle.js（它是 t() 的定義處，註解裡有 t("key") 的示範）與所有註解行。
    for (const f of srcJs.filter((p) => !p.includes("lang-toggle"))) {
        read(f).split(/\r?\n/).forEach((line, i) => {
            const code = line.split("//")[0];
            for (const m of code.matchAll(/\bt\(\s*"([\w.]+)"/g)) (used.get(m[1]) ?? used.set(m[1], []).get(m[1])).push(`${f}:${i + 1}`);
        });
    }
    const missing = [...used.keys()].filter((k) => en[k] == null);
    assert.equal(missing.length, 0, `英文模式會默默顯示繁中：\n${missing.map((k) => `${k}  ← ${used.get(k)[0]}`).join("\n")}`);
});

test("§4-2 / §5 JS 不得寫死顯示字串（繁中只能當 GufoI18n.t 的 fallback）", () => {
    const hits = scanLines(srcJs, (line, f) => {
        // 只豁免語言鈕自己的面板標籤（「中」/「EN」是語言自指、不進字典），不是整支 lang-toggle.js
        if (/lang-toggle\.js$/.test(f) && /js-lang-toggle|b\.textContent\s*=/.test(line)) return null;
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
    const tags = [...read("src/_includes/layouts/base/base.html").matchAll(/src="\.\/js\/([\w-]+)\.js"/g)].map((m) => m[1]);
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

// ─────────────────────────── §1 檔案結構 ───────────────────────────

const componentDirs = ["ui", "components"].flatMap((bucket) =>
    readdirSync(`src/_includes/${bucket}`).map((name) => ({ bucket, name, path: `src/_includes/${bucket}/${name}` }))
);

test("§1-2 元件資料夾內只放 <名>.html / _<名>.scss / <名>.js", () => {
    const bad = componentDirs.flatMap(({ bucket, name, path }) =>
        readdirSync(path)
            .filter((f) => f !== `${name}.html` && f !== `_${name}.scss` && f !== `${name}.js`)
            .map((f) => `${bucket}/${name}/${f}`)
    );
    assert.equal(bad.length, 0, `命名不符或多餘的檔：\n${fail(bad)}`);
});

// ─────────────────────────── 其餘 §2 / §4 / §5 ───────────────────────────

test("§2 模板檔一律用 {# #} 註解，不得出現 <!-- 或 -->", () => {
    // <!-- --> 有三個問題：①原封輸出到 dist（開發註解變成使用者拿到的位元組）
    // ②內文若含 {% %} / {{ }} 仍會被 nunjucks 解析而出錯 ③少一個 `-->` 就把註解內文漏成可見文字
    //   （upload-box 就這樣把兩行說明印到正式頁面上過）。
    // {# #} 三者皆免：build 時移除、內部不解析、少關就 build 失敗。孤兒的 `-->` 一併擋。
    const bad = [];
    for (const f of srcHtml) {
        // 先把內嵌 <script> 挖空：JS 字串裡可能出現字面的 "-->"
        const src = read(f).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.replace(/[<>!-]/g, " "));
        src.split(/\r?\n/).forEach((line, i) => {
            if (/<!--|-->/.test(line)) bad.push(`${f}:${i + 1}  ${line.trim().slice(0, 70)}`);
        });
    }
    assert.equal(bad.length, 0, `改用 {# #}：\n${fail(bad)}`);
});

test("§4 元件 scss 不得出現別的元件 class（祖先位或後裔位都算跨元件覆寫）", () => {
    // 只查祖先位是不夠的：`.header .header-controls { display: none }` 的祖先是自己、
    // 後裔才是別人的元件——照樣是「改別人的樣式」。兩個位置都要裁決。
    const names = new Set(componentDirs.map((c) => c.name));
    const bad = [];
    for (const { name, path } of componentDirs) {
        const f = `${path}/_${name}.scss`;
        if (!existsSync(f)) continue;
        read(f).split(/\r?\n/).forEach((line, i) => {
            const m = line.match(/^\s*\.([\w-]+)\s+\.([\w-]+)/);
            if (!m) return;
            const foreign = [m[1], m[2]].filter((c) => names.has(c) && c !== name);
            if (foreign.length) bad.push(`${f}:${i + 1}  ${line.trim()}  → ${foreign.join("、")}`);
        });
    }
    assert.equal(bad.length, 0, `改別人的樣式要用 owning 元件的 variant/slot class：\n${fail(bad)}`);
});

test("§5 元件 js 都在 DOMContentLoaded 內綁定", () => {
    const bad = srcJs.filter((f) => f.startsWith("src/_includes/") && !read(f).includes("DOMContentLoaded"));
    assert.equal(bad.length, 0, fail(bad));
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
const layoutDirs = readdirSync("src/_includes/layouts");

test("README.md 有交代每一個 layout", () => {
    const doc = read("README.md");
    const missing = layoutDirs.filter((d) => !doc.includes(`layouts/${d}/${d}.html`));
    assert.equal(missing.length, 0, `README 沒提到這些 layout：${missing}`);
});

test("§1-1 每個 layout 一個資料夾，只放 <名>.html / _<名>.scss", () => {
    const bad = layoutDirs.flatMap((d) =>
        readdirSync(`src/_includes/layouts/${d}`)
            .filter((f) => f !== `${d}.html` && f !== `_${d}.scss`)
            .map((f) => `layouts/${d}/${f}`)
    );
    assert.equal(bad.length, 0, `layout 資料夾內有不該存在的檔案：\n${bad.join("\n")}`);
});

test("README.md 的數字（page-shell 頁數、元件數）與實況一致", () => {
    const doc = read("README.md");
    const pages = gitFiles('"src/pages/**/*.html"').filter((f) => /^layout: layouts\/page-shell\/page-shell\.html\s*$/m.test(read(f))).length;
    const comps = componentDirs.length;
    const ui = componentDirs.filter((c) => c.bucket === "ui").length;
    const biz = componentDirs.filter((c) => c.bucket === "components").length;
    assert.ok(doc.includes(`管理端 ${pages} 頁`), `README 的頁數過期，實際 ${pages} 頁`);
    assert.ok(doc.includes(`${comps} 個元件`), `README 的元件數過期，實際 ${comps} 個`);
    // 搬桶時總數不變，兩個子數字會靜默過期
    assert.ok(doc.includes(`（${ui} 個）`), `README 的 ui/ 數過期，實際 ${ui} 個`);
    assert.ok(doc.includes(`（${biz} 個）`), `README 的 components/ 數過期，實際 ${biz} 個`);
});

test("md 的 §N 引用都指向 GUIDELINE 存在的章節，README 的引用要標明 GUIDELINE", () => {
    const guideline = read("GUIDELINE.md");
    const sections = new Set(
        [...guideline.matchAll(/^#{2,3} (\d+)(?:-(\d+))?\./gm)].map((m) => (m[2] ? `${m[1]}-${m[2]}` : m[1]))
    );
    const bad = [];
    // GUIDELINE 內的 §N 一律指自己
    guideline.split(/\r?\n/).forEach((line, i) => {
        for (const m of line.matchAll(/§\s?(\d+(?:-\d+)?)/g))
            if (!sections.has(m[1])) bad.push(`GUIDELINE.md:${i + 1}  §${m[1]} 不存在`);
    });
    // README 的 §N 必須寫明是 GUIDELINE 的（README 自己沒有 §N 章節）
    read("README.md").split(/\r?\n/).forEach((line, i) => {
        for (const m of line.matchAll(/§\s?(\d+(?:-\d+)?)/g)) {
            const before = line.slice(Math.max(0, m.index - 30), m.index);
            if (!/GUIDELINE/.test(before)) bad.push(`README.md:${i + 1}  §${m[1]} 沒標明是 GUIDELINE 的章節`);
            else if (!sections.has(m[1])) bad.push(`README.md:${i + 1}  GUIDELINE §${m[1]} 不存在`);
        }
    });
    assert.equal(bad.length, 0, fail(bad));
});

test("md 的相對連結都指向存在的檔案", () => {
    const bad = [];
    for (const doc of ["README.md", "GUIDELINE.md", "TAILWIND-CONVERSION.md"])
        for (const m of read(doc).matchAll(/\]\((?!https?:)([^)#]+)/g))
            if (!existsSync(m[1])) bad.push(`${doc}  → ${m[1]}`);
    assert.equal(bad.length, 0, fail(bad));
});

test("GUIDELINE.md 不放會腐化的枚舉（頁數、元件數）", () => {
    const doc = read("GUIDELINE.md");
    const bad = [/全\s*\d+\s*頁/, /目前有\s*\d+\s*個元件/, /\d+\s*個元件/].filter((re) => re.test(doc));
    assert.equal(bad.length, 0, `GUIDELINE 出現了會隨專案變動的數字，應移到 README：${bad}`);
});

// ─────────── 地毯式稽核抓到、但既有測試沒涵蓋的規則 ───────────

test("§4 可點的東西一律用真 button，且不得省略 type", () => {
    // 掃的是原始碼（`{% if %}` 兩個分支都要驗），所以要先把 {# #} 註解挖掉——
    // 檔頭註解裡寫「一律用真 `<button>`」會被 tagsOf 當成一顆沒有 type 的按鈕。
    const stripNjk = (s) => s.replace(/\{#[\s\S]*?#\}/g, "");
    const hits = [];
    for (const f of srcHtml)
        for (const { tag, attrs, raw } of tagsOf(stripNjk(read(f))))
            if (tag === "button" && !/\btype=/.test(attrs)) hits.push(`${f}  ${raw.slice(0, 90)}`);
    assert.equal(hits.length, 0, `<button> 缺 type（預設是 submit，會誤送表單）：\n${fail(hits)}`);
});

test("§4-2 同一個 i18n key 的繁中原文全站必須一致", () => {
    // 切回繁中的預設值是「以 key 為索引、從 DOM 就地擷取」，同 key 兩種繁中會互相覆蓋
    const ATTRS = [["title", "title"], ["aria-label", "aria-label"], ["placeholder", "placeholder"], ["alt", "alt"], ["data-toast", "data-toast"]];
    const seen = new Map(); // key -> Map(繁中 -> [出處])
    const record = (key, zh, where) => {
        if (!key || key.includes("{{") || !zh || !zh.trim()) return;
        if (!seen.has(key)) seen.set(key, new Map());
        const variants = seen.get(key);
        if (!variants.has(zh)) variants.set(zh, []);
        variants.get(zh).push(where);
    };
    for (const f of srcHtml) {
        const html = read(f);
        for (const m of html.matchAll(/data-i18n="([\w.]+)"[^>]*>([^<]*)/g)) record(m[1], m[2].trim(), f);
        for (const { attrs } of tagsOf(html))
            for (const [suffix, target] of ATTRS) {
                const k = attrs.match(new RegExp(String.raw`data-i18n-${suffix}="([\w.]+)"`));
                const v = attrs.match(new RegExp(String.raw`(?:^|\s)${target}="([^"]*)"`));
                if (k && v) record(k[1], v[1].trim(), f);
            }
    }
    const bad = [];
    for (const [key, variants] of seen)
        if (variants.size > 1)
            bad.push(`${key}\n` + [...variants].map(([zh, files]) => `      「${zh}」 ← ${[...new Set(files)].join(", ")}`).join("\n"));
    assert.equal(bad.length, 0, `同一個 key 出現多種繁中原文（切回繁中時會互相覆蓋）：\n${bad.join("\n")}`);
});

test("元件的 html 都必須被 include（不得有孤兒死碼）", () => {
    const allMarkup = srcHtml.map(read).join("\n");
    const orphans = componentDirs
        .filter(({ name, path }) => existsSync(`${path}/${name}.html`))
        .filter(({ bucket, name }) => !allMarkup.includes(`include "${bucket}/${name}/${name}.html"`))
        .map(({ bucket, name }) => `${bucket}/${name}/${name}.html`);
    assert.equal(orphans.length, 0, `沒有任何頁面/元件 include 它們（展示片段請在 component.html include）：\n${orphans.join("\n")}`);
});

test("每個開窗鈕（data-open-modal / openModal('X')）在同一頁上都要找得到 <dialog id=\"X\">", () => {
    // 曾經：把 showcase 的 previewModal 改名成 previewTextModal，漏改了 ui/link-modal 的展示鈕，
    // 於是那顆鈕在它唯一出現的頁面上點了沒反應。靜態看不出來，渲染後一比對就抓到。
    //
    // 這條測試自己也差點被拆掉：inline onclick="openModal('X')" 全面改成 data-open-modal="X" 之後，
    // 舊的 regex 在 dist 上零命中、變成對空集合斷言的假綠燈。openModal(id) 找不到 id 是靜默 return，
    // 所以一個拼錯的 data-open-modal 就是點了沒反應的死鈕。兩種寫法都要掃。
    const REFS = [/data-open-modal="([^"]+)"/g, /openModal\(\s*['"]([^'"]+)['"]/g];
    const hits = [];
    let refCount = 0;
    for (const f of distHtml) {
        const html = read(`dist/${f}`);
        const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
        for (const re of REFS)
            for (const m of html.matchAll(re)) {
                refCount++;
                if (!ids.has(m[1])) hits.push(`dist/${f}  開窗鈕指向 "${m[1]}"，本頁找不到對應的 id`);
            }
    }
    assert.ok(refCount > 0, "dist 裡一個開窗鈕都掃不到 —— 機制換掉了就要跟著改這條測試，別讓它變假綠燈");
    assert.equal(hits.length, 0, `按鈕點了打不開：\n${fail(hits)}`);
});

test("i18n 字典的快取失效真的有生效（dist 的 fetch 帶 ?v=）", () => {
    // hash-assets.mjs 曾經用 String.replace(字串,…) 只換到第一個出現處——那是註解，
    // 真正的 fetch 從來沒被蓋章，整個 cache-busting 形同虛設。
    const js = read("dist/js/lang-toggle.js");
    assert.match(js, /fetch\("\.\/i18n\/en\.json\?v=[a-f0-9]{8}"\)/, "lang-toggle.js 的 fetch 沒有 content hash");
});

test("§4 同一頁的 id 不得重複（label[for] / aria-labelledby / getElementById 會指錯）", () => {
    // 共用元件會在同一頁 include 兩次（header-controls 同時住在 header 與 mobile-nav 展開的選單裡）。
    // 只要有人替它加一顆靜態 id，就會靜默產生重複 id。這條在 dist 上驗，才看得到渲染後的實況。
    const bad = [];
    for (const f of distHtml) {
        const seen = new Map();
        for (const m of read(`dist/${f}`).matchAll(/\sid="([^"]+)"/g))
            seen.set(m[1], (seen.get(m[1]) || 0) + 1);
        for (const [id, n] of seen) if (n > 1) bad.push(`dist/${f}  id="${id}" × ${n}`);
    }
    assert.equal(bad.length, 0, `同頁重複的 id：\n${fail(bad)}`);
});

test("§9 裸元素選擇器只准出現在 _normalize / _base", () => {
    // 三個一定要做對的地方（否則就是假綠燈）：
    //  1. 判斷巢狀要數大括號，不能看縮排——_guideline.scss 縮排是平的，aside/section/footer 在 .guideline-page {} 內。
    //  2. 數大括號前要先剝掉字串與註解，否則 `content: "{"` 會讓 depth 永久偏移。
    //  3. 選擇器可以跨行（`section,\n.foo {`），要累積到 `{` 為止，且逗號每一組都要檢查。
    //  @media 之類的 at-rule 區塊不算「巢狀」——裡面的裸元素一樣會洩漏到全站。
    const ELEMENTS = new Set(["html", "body", "header", "footer", "aside", "main", "section", "nav",
        "article", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "p", "a",
        "h1", "h2", "h3", "h4", "h5", "h6", "img", "form", "div", "span", "button", "input", "select", "textarea"]);
    const strip = (s) => s
        .replace(/\/\*[\s\S]*?\*\//g, "")            // 區塊註解
        .replace(/\/\/[^\n]*/g, "")                  // 行註解
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')         // 字串（含 content: "{"）
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/#\{[^}]*\}/g, "V");                // scss 插值 #{$i}

    const hits = [];
    for (const f of srcScss.filter((p) => !/scss\/_(normalize|base)\.scss$/.test(p))) {
        const src = strip(read(f));
        // @media / @supports / @each 之類會「就地展開」，不算一層巢狀；
        // @mixin / @keyframes / @function 的內容不在原地輸出（@include 到哪就在哪），視為一層。
        const OPAQUE = /^@(mixin|keyframes|function)\b/;
        const stack = [];
        let buf = "", line = 1, selLine = 1;
        for (let i = 0; i < src.length; i++) {
            const ch = src[i];
            if (ch === "\n") { line++; buf += " "; continue; }
            if (ch === "{") {
                const sel = buf.trim();
                const isAtRule = sel.startsWith("@");
                // 「頂層」只數會就地輸出的巢狀層數：@media 包著的裸元素一樣會洩漏到全站
                const styleDepth = stack.filter((x) => x === "rule").length;
                if (!isAtRule && styleDepth === 0) {
                    for (const group of sel.split(",")) {
                        // 4. 屬性／偽類要剝掉再比對元素名，否則 `input[type="checkbox"] {}` 這種
                        //    一樣會洩漏全站的寫法會靜默漏網。但 `body.guideline-page`、
                        //    `button.form-control` 有 class 收窄，不洩漏 → 只在整段沒有 . / # 時才算裸。
                        //    判斷「有沒有 class/id 收窄」前，要先把整段屬性選擇器連值一起挖掉——
                        //    否則 `img[src="a.png"]`、`a[href="#x"]` 的值裡那個 . / # 會被誤當成收窄。
                        const compound = group.trim().split(/[\s>+~]/)[0];
                        const bare = compound.replace(/\[[^\]]*\]/g, "");
                        const elem = bare.split(/[.#:]/)[0];
                        if (/^[a-z][a-z0-9]*$/.test(elem) && ELEMENTS.has(elem) && !/[.#]/.test(bare))
                            hits.push(`${f}:${selLine}  ${group.trim()}`);
                    }
                }
                stack.push(!isAtRule || OPAQUE.test(sel) ? "rule" : "@");
                buf = "";
            } else if (ch === "}") { stack.pop(); buf = ""; }
            else if (ch === ";") buf = "";
            else { if (!buf.trim()) selLine = line; buf += ch; }   // 選擇器起始行，錯誤訊息才指得準
        }
    }
    assert.equal(hits.length, 0, `打包進單一 main.css 會洩漏到全站：\n${fail(hits)}`);
});

test("§4 :root 與 [data-theme=dark] 的顏色 token 集合必須一致", () => {
    const src = read("src/scss/_var.scss");
    // 用「選擇器所在的行」定位，不要用 indexOf——檔頭註解裡就提到了 [data-theme="dark"]
    const rootAt = src.search(/^:root\s*\{/m);
    const darkAt = src.search(/^\[data-theme="dark"\]\s*\{/m);
    assert.ok(rootAt >= 0 && darkAt > rootAt, "_var.scss 找不到 :root / [data-theme=dark] 區塊");
    // 用大括號配對切出區塊，不要一路切到檔尾——日後在 dark 之後再加第三個區塊就會被誤算進來
    const blockAt = (start) => {
        let depth = 0;
        for (let i = src.indexOf("{", start); i < src.length; i++) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}" && --depth === 0) return src.slice(start, i);
        }
        throw new Error("_var.scss 大括號不平衡");
    };
    const tokens = (body) => new Set([...body.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]));
    const light = tokens(blockAt(rootAt));
    const dark = tokens(blockAt(darkAt));
    const NON_COLOR = new Set(["--fontFamily"]); // 字型不隨主題變
    const onlyLight = [...light].filter((t) => !dark.has(t) && !NON_COLOR.has(t));
    const onlyDark = [...dark].filter((t) => !light.has(t));
    assert.deepEqual({ onlyLight, onlyDark }, { onlyLight: [], onlyDark: [] }, "漏一邊會靜默壞掉夜間模式");
});

test("§4 元件 scss 不得寫 [data-theme=dark] 分支（零例外）", () => {
    // 只有全域層可以讀主題旗標：_var / _guideline-var（色源）、_base（color-scheme）、
    // _dark-icons（光柵 PNG 反相）。元件一律靠 token 換膚。
    const ALLOW = /src\/scss\/_(var|guideline-var|base|dark-icons)\.scss$/;
    const hits = scanLines(srcScss.filter((f) => !ALLOW.test(f)), (line) =>
        /\[data-theme/.test(line.split("//")[0]) ? "深色分支" : null
    );
    assert.equal(hits.length, 0, `元件只用 token，換膚交給 _var.scss：\n${fail(hits)}`);
});

test("§4 文字族 token 不可拿去當 background-color / border-color", () => {
    // 既有測試擋的是反方向（填充 token 當 color:）。文字 token 為了在黑底可讀而提亮，
    // 當填充時白字會讀不到——兩個方向都要擋。
    // 涵蓋簡寫（background:）與各種 border 寫法；outline 刻意排除——§4-1 規定焦點環用 --brand-text
    // 清單由 COLOR_ROLES 衍生（單一真相源）：手打清單會偷偷漏掉某顆 token 而變成隱藏例外。
    const TEXT = COLOR_ROLES.textOnSurface.map((t) => t.slice(2)).join("|");
    const PROP = "background(?:-color)?|border(?:-color|-top|-right|-bottom|-left|-block|-inline)?|box-shadow|fill|stroke";
    const re = new RegExp(String.raw`(?:^|[\s;{])(?:${PROP})\s*:[^;]*var\(--(?:${TEXT})\)`);
    const hits = scanLines(srcScss, (line) => (re.test(line.split("//")[0]) ? "文字 token 當填充/邊框" : null));
    assert.equal(hits.length, 0, `白字疊上去會讀不到：\n${fail(hits)}`);
});

// §4「新增或調整任何顏色都要重算這兩個數字」——與其相信 _var.scss 的手寫註解（前面已抓到兩個
// 憑感覺寫的數字），不如每次 CI 實算。分類是**窮舉**的：新增一顆顏色 token 若沒歸類，測試就紅。
const COLOR_ROLES = {
    // 有色填充：疊白字 --on-accent 要 ≥4.5:1，且填充對底色 ≥3:1（WCAG 1.4.11）
    fillOnWhiteText: ["--brand", "--brand-hover", "--success", "--success-hover", "--danger", "--danger-hover",
        "--info", "--accent-orange", "--accent-orange-hover", "--accent-teal", "--accent-teal-hover"],
    // 黃底：天生太亮 —— 放不下白字，對淺色底也拉不開 3:1。改配 --on-warning 深字，兩個門檻一起豁免（§4）
    fillOnDarkText: ["--warning", "--warning-hover"],
    // 當內文用：疊 --surface / --surface-raised 要 ≥4.5:1
    textOnSurface: ["--text", "--text-strong", "--text-muted", "--brand-text", "--brand-text-hover", "--danger-text"],
    // 前景墨色：文字與「不承載文字的圖形記號」（勾記、radio 圓點、進度條、步驟底線）共用一顆。
    // 它是前景不是填充，故套文字的 ≥4.5:1 門檻（自然也滿足圖形的 1.4.11 ≥3:1）。見 §4。
    inkOnSurface: ["--brand-ink"],
    surfaces: ["--surface", "--surface-raised", "--surface-sunken", "--surface-hover", "--surface-disabled", "--surface-input"],
    // 成對的：[前景, 背景] 要 ≥4.5:1
    pairs: [["--tooltip-text", "--tooltip-bg"]],
    // chrome 零件：不承載內文，不做內文對比斷言（邊框/捲軸/軌道/把手/tint/陰影/遮罩/漸層）
    chrome: ["--on-accent", "--on-warning", "--border", "--border-subtle", "--brand-tint",
        "--scrollbar-thumb", "--scrollbar-thumb-strong", "--control-track", "--control-track-alt",
        "--control-knob", "--toggle-on", "--pattern-tint",
        "--shadow", "--shadow-strong", "--overlay", "--overlay-tint", "--brand-gradient"],
    // 非顏色，不參與分類
    nonColor: ["--fontFamily", "--theme-icon-light", "--theme-icon-dark", "--raster-invert", "--pattern-blend"],
};

test("§4 對比度硬規則：逐色實算（白字疊填充 ≥4.5、填充對底色 ≥3、內文疊表面 ≥4.5）", () => {
    const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const lum = (hex) => {
        const body = hex.slice(1);
        // #rgb / #rgba → 展開；#rrggbb / #rrggbbaa → 原樣。alpha 不參與亮度計算。
        const rgb = body.length <= 4 ? body.slice(0, 3).replace(/./g, (c) => c + c) : body.slice(0, 6);
        if (rgb.length !== 6) throw new Error(`無法解析色值 ${hex}`);
        const n = parseInt(rgb, 16);
        return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    };
    const src = read("src/scss/_var.scss");
    const blockAt = (start) => {
        let depth = 0;
        for (let i = src.indexOf("{", start); i < src.length; i++) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}" && --depth === 0) return src.slice(start, i);
        }
        throw new Error("_var.scss 大括號不平衡");
    };
    // 抓「每一個」宣告，不只 hex —— 否則用 rgba()/gradient 寫的新填充色會靜默逃過窮舉分類
    const vars = (body) => Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

    const { fillOnWhiteText, fillOnDarkText, textOnSurface, inkOnSurface, surfaces, pairs, chrome, nonColor } = COLOR_ROLES;
    const needsHex = new Set([...fillOnWhiteText, ...fillOnDarkText, ...textOnSurface, ...inkOnSurface, ...surfaces, ...pairs.flat()]);
    const classified = new Set([...needsHex, ...chrome, ...nonColor]);
    const bad = [];

    for (const [mode, at] of [["light", /^:root\s*\{/m], ["dark", /^\[data-theme="dark"\]\s*\{/m]]) {
        const t = vars(blockAt(src.search(at)));
        // 窮舉：每一顆 token 都要被歸類，否則新增顏色會靜默逃過對比檢查
        for (const token of Object.keys(t))
            if (!classified.has(token)) bad.push(`${mode} ${token} 沒有被歸類到 COLOR_ROLES —— 它是填充、文字、表面、還是 chrome？`);
        const get = (k) => {
            const v = t[k];
            if (!v) throw new Error(`_var.scss(${mode}) 缺少 ${k}`);
            if (!/^#[0-9a-fA-F]{3,8}$/.test(v)) throw new Error(`_var.scss(${mode}) 的 ${k} 要參與對比計算，必須是 hex，實際是 ${v}`);
            return v;
        };
        const ratio = (a, b) => { const [x, y] = [lum(get(a)), lum(get(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const check = (r, min, msg) => { if (r < min) bad.push(`${mode} ${msg} = ${r.toFixed(2)} < ${min}`); };

        for (const f of fillOnWhiteText) {
            check(ratio("--on-accent", f), 4.5, `白字疊 ${f}`);
            for (const bg of ["--surface", "--surface-raised"]) check(ratio(f, bg), 3, `${f} 對底色 ${bg}`);
        }
        for (const f of fillOnDarkText) check(ratio("--on-warning", f), 4.5, `深字疊 ${f}`);
        for (const c of [...textOnSurface, ...inkOnSurface]) for (const bg of ["--surface", "--surface-raised"]) check(ratio(c, bg), 4.5, `內文 ${c} on ${bg}`);
        for (const [fg, bg] of pairs) check(ratio(fg, bg), 4.5, `${fg} on ${bg}`);
    }
    assert.equal(bad.length, 0, `WCAG AA / 1.4.11：\n${fail(bad)}`);
});

test("§4 工具層：文字大小/顏色工具不帶 !important（零例外）", () => {
    let cur = null;
    const hits = [];
    read("src/scss/_utilities.scss").split(/\r?\n/).forEach((raw, i) => {
        const line = raw.split("//")[0];
        const sel = line.match(/^\.([\w-]+)[\s,{]/);
        if (sel) cur = sel[1];
        // -webkit-text-fill-color 也是文字顏色；錨點用 (^|[\s;{]) 才不會被 background-color 蒙混
        if (/(?:^|[\s;{])(-webkit-text-fill-color|color|font-size|font-weight)\s*:[^;]*!important/.test(line))
            hits.push(`_utilities.scss:${i + 1}  .${cur}  ${line.trim()}`);
    });
    assert.equal(hits.length, 0, `要壓過元件色，改由 owning 層提供變體（如 .page-title.plain）：\n${fail(hits)}`);
});

test("§4 元件 scss 不得用 #id 選擇器（那是比 class 更緊的跨元件耦合）", () => {
    const files = srcScss.filter((f) => !/scss\/_(normalize|base)\.scss$/.test(f));
    const hits = scanLines(files, (line) => {
        const code = line.split("//")[0];
        return /^\s*#[a-zA-Z][\w-]*/.test(code) ? "id 選擇器" : null;
    });
    assert.equal(hits.length, 0, `改用元件自有的 slot class：\n${fail(hits)}`);
});

test("src/images 每張圖都必須被引用", () => {
    const corpus = [...srcHtml, ...srcJs, ...srcScss].map(read).join("\n");
    const unused = readdirSync("src/images").filter((img) => !corpus.includes(img));
    assert.equal(unused.length, 0, `未被任何 html/js/scss 引用的圖片：\n${unused.join("\n")}`);
});

test("§1-1 桶歸屬：components/ 要用到其他元件（或是專屬子片段）；ui/ 要零依賴", () => {
    // 只有元件總覽頁會 include「展示片段」；catalog.html 是真實頁面（有語言/深淺鈕、在 i18n 範圍）
    const SHOWCASE = new Set(["src/pages/components/component.html"]);
    const selectorClasses = (src) => {
        const out = new Set();
        for (const raw of src.split(/\r?\n/)) {
            const code = raw.split("//")[0];
            const i = code.indexOf("{");
            if (i < 0 || /^\s*[@$]/.test(code.slice(0, i))) continue;
            for (const m of code.slice(0, i).matchAll(/\.([A-Za-z][\w-]*)/g)) out.add(m[1]);
        }
        return out;
    };
    // class → 定義它的元件（多處定義＝歸屬不明，不當判斷依據）
    const defs = new Map();
    for (const { bucket, name, path } of componentDirs) {
        const scss = `${path}/_${name}.scss`;
        if (!existsSync(scss)) continue;
        for (const cls of selectorClasses(read(scss))) {
            if (!defs.has(cls)) defs.set(cls, new Set());
            defs.get(cls).add(`${bucket}/${name}`);
        }
    }
    const GLOBAL = new Set();
    for (const f of srcScss.filter((p) => p.includes("src/scss/"))) for (const c of selectorClasses(read(f))) GLOBAL.add(c);
    const ownerOf = (cls) => {
        if (GLOBAL.has(cls) || cls.startsWith("js-")) return null;
        const s = defs.get(cls);
        return s && s.size === 1 ? [...s][0] : null;
    };
    const includedBy = new Map();
    for (const f of srcHtml)
        for (const m of read(f).matchAll(/include\s+"(?:ui|components)\/([\w-]+)\//g)) {
            if (!includedBy.has(m[1])) includedBy.set(m[1], []);
            includedBy.get(m[1]).push(f.replace(/\\/g, "/"));
        }
    // 生產 markup 具遞移性：被真實頁面 include 的是生產；被「生產元件」include 的也是。
    // （accordion 只被 default-table include，而 default-table 只被 component.html include
    //   ⇒ 整條鏈都是展示片段。）
    // layouts 也算「消費端」：真實頁面靠 front matter 的 `layout:` 掛 header/footer 等 chrome，
    // 不是靠 {% include %}。不這樣算的話整棵 chrome 子樹永遠不會被標成 production（漏報）。
    const isPage = (f) => !/\/_includes\/(ui|components)\//.test(f);
    const production = new Set();
    for (let changed = true; changed; ) {
        changed = false;
        for (const { name } of componentDirs) {
            if (production.has(name)) continue;
            const live = (includedBy.get(name) || []).some((f) =>
                isPage(f) ? !SHOWCASE.has(f) : production.has(basename(f, ".html"))
            );
            if (live) { production.add(name); changed = true; }
        }
    }

    const bad = [];
    for (const { bucket, name, path } of componentDirs) {
        const self = `${bucket}/${name}`;
        const htmlPath = `${path}/${name}.html`;
        const scssPath = `${path}/_${name}.scss`;
        const jsPath = `${path}/${name}.js`;
        const subFragment = (includedBy.get(name) || []).some((f) => !isPage(f));

        // §1-1：「判斷依賴時只看 scss + js + 生產 markup」——展示片段（只被元件總覽頁 include 的
        // html）為了示範情境會 include/掛用別的元件，一律不算依賴，否則每個原子都會被推去 components/。
        // 兩個方向共用同一組證據；分成兩組（一組寬、一組嚴）就是在規則之外偷開例外。
        const deps = new Set();
        const add = (o) => { if (o && o !== self) deps.add(o); };

        if (existsSync(htmlPath) && production.has(name)) {
            const html = read(htmlPath);
            for (const m of html.matchAll(/include\s+"(ui|components)\/([\w-]+)\//g)) if (m[2] !== name) add(`${m[1]}/${m[2]}`);
            for (const m of html.matchAll(/class="([^"]*)"/g))
                for (const cls of m[1].split(/\s+/)) {
                    if (!cls || cls.includes("{")) continue;
                    add(ownerOf(cls));
                }
        }
        if (existsSync(scssPath))
            for (const cls of selectorClasses(read(scssPath))) add(ownerOf(cls));
        if (existsSync(jsPath))
            for (const [fn, o] of [["openModal", "ui/modals"], ["closeModal", "ui/modals"], ["showToast", "ui/toast"]])
                if (new RegExp(String.raw`\b${fn}\s*\(`).test(read(jsPath))) add(o);

        if (bucket === "components" && deps.size === 0 && !subFragment) bad.push(`${self} 零依賴、也不是專屬子片段 → 應搬去 ui/`);
        if (bucket === "ui" && deps.size > 0) bad.push(`${self} 用到 ${[...deps].join("、")} → 應搬去 components/`);
    }
    assert.equal(bad.length, 0, `桶放錯了：\n${bad.join("\n")}`);
});
