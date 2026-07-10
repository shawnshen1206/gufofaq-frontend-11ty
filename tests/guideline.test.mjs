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

// 這份檔案有三十幾條在對這四個集合做 assert.equal(hits.length, 0)。
// git ls-files 對零命中是回空陣列（不報錯），所以 cwd 跑錯、資料夾改名、glob 失準，
// 都會讓所有測試在「零樣本」下集體變綠。這四行是全檔的總開關。
assert.ok(srcHtml.length > 20, `srcHtml 只掃到 ${srcHtml.length} 個檔 —— 掃描集合空了，整份測試在空轉`);
assert.ok(srcScss.length > 20, `srcScss 只掃到 ${srcScss.length} 個檔 —— 掃描集合空了，整份測試在空轉`);
assert.ok(srcJs.length > 10, `srcJs 只掃到 ${srcJs.length} 個檔 —— 掃描集合空了，整份測試在空轉`);
assert.ok(distHtml.length > 20, `dist 只掃到 ${distHtml.length} 個 html —— build 失敗了？整份測試在空轉`);

// dist 比 src 舊 ＝ 在驗上一版的渲染結果。單獨跑 npm test 時最容易中招（npm run check 會先 build）。
{
    const newest = (files) => Math.max(...files.map((f) => statSync(f).mtimeMs));
    if (newest([...srcHtml, ...srcScss, ...srcJs]) > newest(distHtml.map((f) => `dist/${f}`)))
        throw new Error("dist 比 src 舊 —— 請先 npm run build，否則跑在 dist 上的結構檢查驗的是上一版");
}

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

// dist 的標籤掃描一律先剝掉「看起來像標籤、其實不是」的東西：
// HTML 註解裡的範例 <div role="button">、inline script 裡的模板字串 `<li>${x}</li>`，
// 都會被 tagsOf 當成真標籤。剝乾淨再掃。
const stripNonMarkup = (html) =>
    html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
const distDoc = (f) => stripNonMarkup(read(`dist/${f}`));

// 只取「真的在標籤裡」的屬性，避免抓到散文裡引號包住的範例
// （GUIDELINE 自己在 component.html 寫了一句「不要寫行內 style="margin-..."」）
function* tagsOf(html) {
    for (const m of html.matchAll(/<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
        yield { tag: m[1].toLowerCase(), attrs: m[2] || "", raw: m[0] };
    }
}

// ─────────────────────────── §2 模板語法白名單 ───────────────────────────

test("§2 只准 `| safe`，模板標籤只准白名單那幾個", () => {
    // 用白名單而不是黑名單：黑名單漏了 {% from "x" import y %}（行首關鍵字是 from）、
    // 漏了空白控制的 {%- macro %}、也漏了 block-set 的 {% endset %}。列出准的，其餘一律擋。
    const ALLOWED = new Set(["set", "for", "endfor", "if", "elif", "else", "endif", "include"]);
    const hits = scanLines(srcHtml, (line) => {
        // 先剝掉表達式裡的字串常值，否則 {{ "a|b" | safe }} 會在字串內的 | 誤命中，
        // 而 {{ "}" | upper }} 會讓舊的 [^}] 提早停手、漏掉後面真正的 filter。
        for (const m of line.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
            const expr = m[1].replace(/"[^"]*"|'[^']*'/g, "");
            for (const f of expr.matchAll(/\|\s*(\w+)/g)) if (f[1] !== "safe") return `禁用 filter: | ${f[1]}`;
        }
        for (const m of line.matchAll(/\{%[-+]?\s*(\w+)/g))
            if (!ALLOWED.has(m[1])) return `白名單外的標籤: {% ${m[1]} %}`;
        return null;
    });
    assert.equal(hits.length, 0, `§2 白名單外的語法：\n${fail(hits)}`);
});

test("§2 同一頁第二次用到某個元件參數時，該參數必須先重設（{% set %} 是頁面全域的）", () => {
    // 這是本專案反覆踩到的第一大坑，而且靜默：漏掉一次重設，元件就沿用上一次的值，
    // 沒有任何測試會紅。曾經：component.html 若少了 {% set stepNodesLg = false %}，
    // 後面的 step-btn-wrap 會沿用前一個 step-nodes 的 true，大步驟條從 3 個變成 7 個。
    //
    // 判準以「變數」為單位而不是以「元件」為單位 —— stepNodesLg 被 step-nodes 與
    // step-btn-wrap 兩個不同元件消費，以元件為單位會漏掉跨元件的殘留。

    const stripNjk = (t) => t.replace(/\{#[\s\S]*?#\}/g, "");
    const root = (v) => v.split(".")[0];
    const RESERVED = new Set(["loop", "true", "false", "not", "and", "or"]);

    // 一個元件 html 直接讀了哪些外部變數（排除自己 set 的、迴圈變數、保留字）
    const directReads = (file) => {
        const t = stripNjk(read(file));
        const local = new Set([...t.matchAll(/\{%\s*set\s+(\w+)/g)].map((m) => m[1]));
        const loops = new Set([...t.matchAll(/\{%\s*for\s+(\w+)\s+in\s/g)].map((m) => m[1]));
        const out = new Set();
        const add = (v) => {
            v = root(v);
            if (v && !RESERVED.has(v) && !local.has(v) && !loops.has(v)) out.add(v);
        };
        for (const m of t.matchAll(/\{\{\s*([A-Za-z_]\w*(?:\.\w+)*)/g)) add(m[1]);
        for (const m of t.matchAll(/\{%\s*if\s+(?:not\s+)?([A-Za-z_]\w*(?:\.\w+)*)/g)) add(m[1]);
        for (const m of t.matchAll(/\{%\s*for\s+\w+\s+in\s+([A-Za-z_]\w*(?:\.\w+)*)/g)) add(m[1]);
        return out;
    };
    const includesIn = (text) =>
        [...stripNjk(text).matchAll(/\{%\s*include\s+"((?:ui|components)\/[\w-]+)\/[\w-]+\.html"/g)].map((m) => m[1]);

    // 元件讀的變數 = 自己讀的 ∪ 它 include 的子元件讀的（遞移；子元件的參數由父元件轉發）
    const cache = new Map();
    const readsOf = (key, seen = new Set()) => {
        if (cache.has(key)) return cache.get(key);
        if (seen.has(key)) return new Set();
        seen.add(key);
        const file = `src/_includes/${key}/${key.split("/")[1]}.html`;
        if (!existsSync(file)) return new Set();
        const out = directReads(file);
        for (const child of includesIn(read(file))) for (const v of readsOf(child, seen)) out.add(v);
        cache.set(key, out);
        return out;
    };

    const pages = srcHtml.filter((f) => !f.includes("_includes"));
    assert.ok(pages.length > 20, `只掃到 ${pages.length} 個頁面 —— 這條測試在空轉`);

    let checked = 0;
    const hits = [];
    for (const page of pages) {
        const lines = stripNjk(read(page)).split(/\r?\n/);
        const setAt = new Map(); // 變數 → 被 set 的行號（1-based）
        const consume = new Map(); // 變數 → 消費它的 include 行號
        lines.forEach((line, i) => {
            for (const m of line.matchAll(/\{%\s*set\s+(\w+)\s*=/g)) {
                if (!setAt.has(m[1])) setAt.set(m[1], []);
                setAt.get(m[1]).push(i + 1);
            }
            for (const key of includesIn(line))
                for (const v of readsOf(key)) {
                    if (!consume.has(v)) consume.set(v, []);
                    consume.get(v).push(i + 1);
                }
        });

        for (const [v, points] of consume) {
            const sets = setAt.get(v) || [];
            for (let k = 1; k < points.length; k++) {
                const [prev, here] = [points[k - 1], points[k]];
                if (!sets.some((l) => l < here)) continue; // 從沒設過 → 不可能有殘留
                checked++;
                if (!sets.some((l) => l > prev && l < here))
                    hits.push(`${page}:${here}  第二次用到參數 ${v} 之前沒有重設它，會沿用第 ${prev} 行那次的值`);
            }
        }
    }
    assert.ok(checked > 0, "沒有任何『同頁重複消費同一參數』的情境 —— 這條測試在空轉");
    assert.equal(hits.length, 0, `{% set %} 是頁面全域的（§2）：\n${fail(hits)}`);
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
    // -webkit-text-fill-color 也是文字色，但 (?<![-\w]) 為了排除 background-color 會把它一起排除 —— 顯式放行
    const re = new RegExp(String.raw`(?:(?<![-\w])|-webkit-text-fill-)color:\s*var\(--(?:${FILL})(?:-hover)?\)`);
    const hits = scanLines(srcScss, (line) => (re.test(line) ? "填充 token 當文字色" : null));
    assert.equal(hits.length, 0, `深色模式下會讀不到：\n${fail(hits)}`);
});

test("§1-2 頁面不得手寫與既有 modal 元件同 id 的 <dialog>（元件只有一份正本）", () => {
    // 一個 <dialog id> 是一個完整單位。頁面複製一份會得到兩份會分岔的正本
    // （曾經：5-2-1 的 intentionModal、1-2-1 的 deleteModal 各自與元件的 i18n key 走鐘）。
    const dialogIds = (html) => [...html.matchAll(/<dialog[^>]*\sid=["']([^"']+)["']/g)].map((m) => m[1]);
    const owned = new Map(); // dialog id -> [元件…]
    for (const { bucket, name, path } of componentDirs) {
        const html = `${path}/${name}.html`;
        if (!existsSync(html)) continue;
        for (const id of dialogIds(read(html))) {
            if (!owned.has(id)) owned.set(id, []);
            owned.get(id).push(`${bucket}/${name}`);
        }
    }
    const hits = [];
    // 兩個元件宣告同一個 dialog id 也是兩份正本。曾經：apply-settings-modal 與 apply-settings-modal-2
    // 都寫 #ProductionSettingsModal（照抄真 app 兩頁），害得元件庫的示範觸發器只打得開其中一份，
    // 另一份是誰都看不到的死彈窗，而反向測試被同名 id 蒙混過去。dialog id 不是轉換契約，該改名就改名。
    for (const [id, comps] of owned)
        if (comps.length > 1) hits.push(`<dialog id="${id}"> 被 ${comps.length} 個元件各宣告一次：${comps.join("、")}`);
    for (const p of srcHtml.filter((f) => !f.includes("_includes")))
        for (const id of dialogIds(read(p)))
            if (owned.has(id)) hits.push(`${p}  <dialog id="${id}"> 已有元件 ${owned.get(id).join("、")} —— 要用就 {% include %}`);
    assert.ok(owned.size > 0, "元件裡一個 <dialog> 都掃不到 —— 這條測試在空轉");
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

test("§4 no-flash 腳本裡的 theme-color 色碼要等於 --surface-raised", () => {
    // 全站唯一被允許複寫色碼的地方（跑在 CSS 之前，讀不到 var()）。既然躲不掉，就用測試釘住，
    // 免得 token 改了、行動瀏覽器網址列還停在舊色。
    const varScss = read("src/scss/_var.scss");
    const token = (block) => {
        const m = block.match(/--surface-raised:\s*(#[0-9a-fA-F]{3,8})/);
        assert.ok(m, "在 _var.scss 找不到 --surface-raised —— 這條測試在空轉");
        return m[1].toLowerCase();
    };
    // 用行首錨定找選擇器本體，別用 indexOf —— 檔頭註解裡就寫著 [data-theme="dark"] 這串字。
    const darkStart = varScss.search(/^\[data-theme="dark"\]/m);
    assert.ok(darkStart > 0, '_var.scss 找不到 [data-theme="dark"] 區塊');
    const light = token(varScss.slice(0, darkStart));
    const dark = token(varScss.slice(darkStart));

    const base = read("src/_includes/layouts/base/base.html");
    const inline = base.match(/content",\s*t === "dark" \? "(#[0-9a-fA-F]{3,8})" : "(#[0-9a-fA-F]{3,8})"/);
    assert.ok(inline, "base.html 的 no-flash 腳本找不到 theme-color 的深/淺色碼 —— 這條測試在空轉");
    const meta = base.match(/<meta name="theme-color" content="(#[0-9a-fA-F]{3,8})">/);
    assert.ok(meta, "base.html 找不到 <meta name=theme-color> —— 這條測試在空轉");

    const hits = [];
    if (inline[1].toLowerCase() !== dark) hits.push(`no-flash 深色 ${inline[1]} ≠ --surface-raised ${dark}`);
    if (inline[2].toLowerCase() !== light) hits.push(`no-flash 淺色 ${inline[2]} ≠ --surface-raised ${light}`);
    if (meta[1].toLowerCase() !== light) hits.push(`<meta> 預設 ${meta[1]} ≠ 淺色 --surface-raised ${light}`);
    assert.equal(hits.length, 0, `theme-color 與 token 脫鉤：\n${fail(hits)}`);
});

// ─────────────────────────── §4 HTML 規則（跑在渲染後的 dist）───────────────────────────

test("§4 不得用 div 假扮控制項（要用真 <button>）", () => {
    const hits = [];
    for (const f of distHtml) for (const t of tagsOf(distDoc(f)))
        // 只查 role="button" 是只擋一半：div[role=tab/checkbox/switch/radio/…] 一樣沒有鍵盤行為
        if (t.tag === "div" && /\brole=["'](button|tab|checkbox|switch|radio|menuitem|link|option)["']/.test(t.attrs))
            hits.push(`dist/${f}  ${t.raw.slice(0, 70)}`);
    assert.equal(hits.length, 0, `Enter/Space 不會觸發（WCAG 2.1.1）：\n${fail(hits)}`);
});

test("§4 每個 <dialog> 的 aria-labelledby 都要指向存在的 id", () => {
    const hits = [];
    let dialogCount = 0;
    for (const f of distHtml) {
        const html = read(`dist/${f}`);
        const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
        for (const t of tagsOf(html)) {
            if (t.tag !== "dialog") continue;
            dialogCount++;
            const m = t.attrs.match(/aria-labelledby="([^"]+)"/);
            if (!m) hits.push(`dist/${f}  <dialog> 缺 aria-labelledby`);
            else if (!ids.has(m[1])) hits.push(`dist/${f}  aria-labelledby="${m[1]}" 指向不存在的 id`);
        }
    }
    assert.ok(dialogCount > 0, "dist 裡一個 <dialog> 都掃不到 —— 這條測試在空轉");
    assert.equal(hits.length, 0, fail(hits));
});

test("§4 每個 <img> 都要有 width 與 height（消除版位跳動）", () => {
    const hits = [];
    let imgCount = 0;
    for (const f of distHtml) for (const t of tagsOf(distDoc(f)))
        // 錨點用 (^|\s) 而非 \b：\bwidth= 會被 data-width= 蒙混過去（"-"→"w" 之間就有 word boundary）
        if (t.tag === "img" && ++imgCount && !(/(?:^|\s)width=/.test(t.attrs) && /(?:^|\s)height=/.test(t.attrs)))
            hits.push(`dist/${f}  ${t.raw.slice(0, 80)}`);
    assert.ok(imgCount > 0, "dist 裡一張 <img> 都掃不到 —— 這條測試在空轉");
    assert.equal(hits.length, 0, `缺尺寸（CLS）：\n${fail(hits)}`);
});

test("§4 每個 <img> 都要 decoding=\"async\"，且不得 loading=\"lazy\"", () => {
    // 站上圖多為首屏 icon：lazy 反而讓它們在捲進視窗時才開始下載，閃一下才出現。
    let imgCount = 0;
    const hits = [];
    for (const f of distHtml) for (const t of tagsOf(distDoc(f))) {
        if (t.tag !== "img") continue;
        imgCount++;
        if (!/(?:^|\s)decoding="async"/.test(t.attrs)) hits.push(`dist/${f}  缺 decoding="async"：${t.raw.slice(0, 70)}`);
        if (/(?:^|\s)loading="lazy"/.test(t.attrs)) hits.push(`dist/${f}  不該有 loading="lazy"：${t.raw.slice(0, 70)}`);
    }
    assert.ok(imgCount > 0, "dist 裡一張 <img> 都掃不到 —— 這條測試在空轉");
    assert.equal(hits.length, 0, fail(hits));
});

test("§5 data-toast 的結果數與 data-toast-type 的語意數要對得起來", () => {
    // toast.js 直接把 type 串成 class（'toast toast-' + type）。打成 data-toast-type="err"
    // 不會噴錯，只會少掉那條 .toast-err 規則 —— 彈出一個沒有顏色、沒有語意的白盒子。
    //
    // 一顆鈕可以用 `|` 宣告多個結果（模擬 API 的成功／失敗／警告），每點一次換下一個。
    // 型別數多過結果數＝有語意永遠演不出來；少於則沿用最後一個（合法，例如三個結果都是 success）。
    const TYPES = ["success", "error", "warning", "info"];
    const css = read("dist/css/main.css");
    for (const t of TYPES)
        assert.ok(css.includes(`.toast-${t}`), `_toast.scss 少了 .toast-${t} —— 這條測試在空轉`);

    let count = 0;
    const hits = [];
    for (const f of distHtml)
        for (const { attrs, raw } of tagsOf(distDoc(f))) {
            const msg = attrs.match(/(?:^|\s)data-toast="([^"]*)"/);
            if (!msg) continue;
            count++;
            const types = (attrs.match(/(?:^|\s)data-toast-type="([^"]*)"/) || [, "success"])[1].split("|");
            const messages = msg[1].split("|");
            for (const t of types)
                if (!TYPES.includes(t.trim())) hits.push(`dist/${f}  data-toast-type 的 "${t}" 不是 ${TYPES.join(" / ")}`);
            if (types.length > messages.length)
                hits.push(`dist/${f}  ${types.length} 個語意配 ${messages.length} 個結果，多出來的永遠演不到：<${raw.slice(0, 60)}`);
            if (messages.some((m) => !m.trim()))
                hits.push(`dist/${f}  data-toast 有空的結果（多打了一個 |）：<${raw.slice(0, 60)}`);
        }
    assert.ok(count > 0, "dist 裡一個 data-toast 都掃不到 —— 這條測試在空轉");
    assert.equal(hits.length, 0, fail(hits));
});

test("§4 圖示按鈕要有可及名稱（aria-label、按鈕內的文字、或圖片的非空 alt）", () => {
    // title= 不算：輔具不保證會念，觸控與鍵盤焦點也永遠看不到它。
    // 曾經：三處 .info-btn 只掛 title，按鈕裡只有一張 alt="" 的圖，對螢幕報讀器就是一顆無名按鈕。
    let btnCount = 0;
    const hits = [];
    for (const f of distHtml) {
        const html = distDoc(f);
        for (const m of html.matchAll(/<button\b((?:"[^"]*"|'[^']*'|[^>"'])*)>([\s\S]*?)<\/button>/g)) {
            const [, attrs, inner] = m;
            btnCount++;
            if (/(?:^|\s)aria-label(?:ledby)?=/.test(attrs)) continue;
            // 按鈕裡的圖若有非空 alt，那就是這顆鈕的名字（.pager-btn 就靠這個）
            if ([...inner.matchAll(/<img\b[^>]*\salt="([^"]*)"/g)].some((i) => i[1].trim())) continue;
            if (inner.replace(/<[^>]*>/g, "").trim()) continue; // 有文字（含 .sr-only / .tooltip 的內容）
            hits.push(`dist/${f}  無名按鈕：<button${attrs.slice(0, 60)}>`);
        }
    }
    assert.ok(btnCount > 0, "dist 裡一顆 <button> 都掃不到 —— 這條測試在空轉");
    assert.equal(hits.length, 0, `螢幕報讀器只會念「按鈕」：\n${fail(hits)}`);
});

test("§4-2 data-i18n-<後綴> 的後綴，必須是同一個標籤上真的存在的屬性", () => {
    // 「後綴永遠等於它要翻譯的那個屬性名，零例外」。打錯字（data-i18n-arialabel）不會有人發現：
    // 繁中版看不出來，英文版就是那個屬性沒被翻譯，靜默的。
    let pairCount = 0;
    const hits = [];
    for (const f of distHtml) for (const { tag, attrs, raw } of tagsOf(distDoc(f)))
        for (const m of attrs.matchAll(/(?:^|\s)data-i18n-([\w-]+)=/g)) {
            pairCount++;
            const target = m[1];
            if (!new RegExp(`(?:^|\\s)${target}=`).test(attrs))
                hits.push(`dist/${f}  <${tag}> 有 data-i18n-${target}，卻沒有 ${target} 屬性：${raw.slice(0, 70)}`);
        }
    assert.ok(pairCount > 0, "dist 裡一個 data-i18n-<後綴> 都掃不到 —— 這條測試在空轉");
    assert.equal(hits.length, 0, fail(hits));
});

test("§4-2 data-i18n-<後綴> 的後綴，必須在 lang-toggle.js 的 ATTRS 白名單裡", () => {
    // 上一條擋的是「後綴不是真的屬性」。這條擋反方向：後綴是真屬性，但 lang-toggle 根本不會去翻它。
    // 例如 data-i18n-value —— 屬性存在、測試全綠、英文版靜默地留著繁中。
    // 白名單由 lang-toggle.js 的原始碼解析，不是手抄一份（手抄的那份遲早跟本尊分家）。
    const js = read("src/_includes/ui/lang-toggle/lang-toggle.js");
    const decl = js.match(/var ATTRS = \[(.*?)\];/s);
    assert.ok(decl, "在 lang-toggle.js 找不到 ATTRS 宣告 —— 這條測試在空轉");
    const allowed = new Set([...decl[1].matchAll(/\["([\w-]+)"/g)].map((m) => m[1]));
    assert.ok(allowed.size >= 3, `ATTRS 只解析到 ${allowed.size} 個 —— 解析壞了`);

    const used = new Map(); // 後綴 → 出現處
    for (const f of distHtml) for (const { tag, attrs } of tagsOf(distDoc(f)))
        for (const m of attrs.matchAll(/(?:^|\s)data-i18n-([\w-]+)=/g))
            if (!used.has(m[1])) used.set(m[1], `dist/${f} <${tag}>`);
    assert.ok(used.size > 0, "dist 裡一個 data-i18n-<後綴> 都掃不到 —— 這條測試在空轉");

    const hits = [...used].filter(([suffix]) => !allowed.has(suffix))
        .map(([suffix, where]) => `data-i18n-${suffix}（${where}）不在 ATTRS：${[...allowed].join("／")}`);
    assert.equal(hits.length, 0, `英文版會靜默留著繁中：\n${hits.join("\n")}`);
});

test("§5 data-toast 的結果數，必須等於 en.json 裡同一個 key 的結果數", () => {
    // 多結果 toast 用 `|` 分段（成功|失敗）。en.json 的值也用 `|` 分段，由 lang-toggle 整串換掉。
    // 兩邊段數對不上時：英文版點第二下會拿到 undefined，或永遠只看得到第一種結果 —— 而且靜默。
    const en = JSON.parse(read("src/i18n/en.json"));
    const hits = [];
    let checked = 0;
    for (const f of distHtml) for (const { tag, attrs, raw } of tagsOf(distDoc(f))) {
        const key = attrs.match(/(?:^|\s)data-i18n-data-toast="([^"]*)"/);
        const zh = attrs.match(/(?:^|\s)data-toast="([^"]*)"/);
        if (!key || !zh) continue;
        if (!(key[1] in en)) continue; // 「key 都要在 en.json」是另一條測試的事
        checked++;
        const zhN = zh[1].split("|").length;
        const enN = String(en[key[1]]).split("|").length;
        if (zhN !== enN)
            hits.push(`dist/${f} <${tag}> ${key[1]}：繁中 ${zhN} 段、英文 ${enN} 段\n      ${raw.slice(0, 90)}`);
    }
    assert.ok(checked >= 5, `只比對到 ${checked} 個多結果 toast —— 這條測試在空轉`);
    assert.equal(hits.length, 0, `英文版的結果數對不上：\n${hits.join("\n")}`);
});

test("§4 行內 style 只准三種：<col> 欄寬、JS 切換的 display、資料驅動的執行期尺寸", () => {
    const hits = [];
    for (const f of distHtml) for (const t of tagsOf(distDoc(f))) {
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
    for (const f of distHtml) for (const t of tagsOf(distDoc(f)))
        for (const a of ["for", "id", "name", "href"]) if (new RegExp(`\\b${a}=""`).test(t.attrs)) hits.push(`dist/${f}  <${t.tag} ${a}="">`);
    assert.equal(hits.length, 0, fail(hits));
});

test("§4 phrasing 元素（span / p / button）內不得放區塊元素（轉 React 會 hydration 錯誤）", () => {
    const VOID = new Set(["img", "input", "br", "hr", "meta", "link", "col", "source", "area", "base", "wbr"]);
    // <a> 是 HTML5 transparent content model —— 包區塊元素合法（如 upload-card 的 <a> 包整張卡），不列入。
    // <button> 只吃 phrasing content：把 div 假扮的控制項改成真 button 時，內容也要一起換成 span
    // （upload-box 就這樣把非法巢狀從 div[role] 換成 button>div）。
    // 標題的內容模型也只吃 phrasing：<h1><div></div></h1> 一樣是非法巢狀。
    const PHRASING_ONLY = new Set(["span", "p", "button", "h1", "h2", "h3", "h4", "h5", "h6"]);
    // 區塊元素要列全：只列一半等於只擋一半。（`hr`/`img` 這類 void 元素在下面會先被 VOID 跳過，列了也沒用。）
    const BLOCK = new Set(["div", "p", "ul", "ol", "dl", "table", "section", "article", "aside", "nav", "main",
        "header", "footer", "form", "fieldset", "figure", "blockquote", "pre", "details", "dialog",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "li", "dt", "dd", "figcaption", "legend", "address", "hgroup",
        "thead", "tbody", "tfoot", "tr", "td", "th", "colgroup", "caption"]);
    const hits = [];
    for (const f of distHtml) {
        // 必須先剝掉 HTML 註解與 script/style：裡面若寫了 <p> 之類的範例，會被當成真標籤而一路誤判
        const html = stripNonMarkup(read(`dist/${f}`));
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
            // 全站的選單／目錄／麵包屑／欄位提示，key 都住在 {% set %} 的資料陣列裡，
            // 靠 data-i18n="{{ item.i18nKey }}" 渲染 —— 上面那幾條 regex 抓到的是 `{{ ... }}` 字面，一律被 note() 跳過。
            // 不掃這裡的話，新增一筆選單卻忘了補 en.json，英文模式會默默顯示繁中。
            for (const m of line.matchAll(/\b(?:i18nKey|labelKey|placeholderKey|titleKey|descKey):\s*"([\w.]+)"/g)) note(m[1]);
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
            // 只認空白後代組合子的話，`.header > .header-controls` 這種直接子代選擇器整條漏掉。
            // 也不要只看前兩段：`.self .self2 .foreign` 的第三段一樣是別人的 class。
            const sel = line.split("{")[0];
            if (!/^\s*\./.test(sel) || !/[\s>+~]/.test(sel.trim())) return;
            const parts = [...sel.matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
            if (parts.length < 2) return;
            const foreign = parts.filter((c) => names.has(c) && c !== name);
            if (foreign.length) bad.push(`${f}:${i + 1}  ${line.trim()}  → ${foreign.join("、")}`);
        });
    }
    assert.equal(bad.length, 0, `改別人的樣式要用 owning 元件的 variant/slot class：\n${fail(bad)}`);
});

test("§5 會去 DOM 找元素的元件 js 都在 DOMContentLoaded 內綁定", () => {
    // 純函式工具（ui/scroll-lock）載入時不碰 DOM，不必包 DOMContentLoaded；
    // 只要檔案裡出現「去文件裡撈元素」的呼叫，就必須等 DOM parse 完才綁。
    const DOM_QUERY = /document\.(querySelector(All)?|getElementById|getElementsBy\w+)\(/;
    const comp = srcJs.filter((f) => f.startsWith("src/_includes/"));
    assert.ok(comp.length > 0, "掃不到任何元件 js —— 這條測試在空轉");
    const bad = comp.filter((f) => DOM_QUERY.test(read(f)) && !read(f).includes("DOMContentLoaded"));
    assert.equal(bad.length, 0, fail(bad));
});

test("§5 body 捲動鎖是純 CSS，js 不得自己鎖", () => {
    // 曾經：modals.js 與 mobile-nav.js 各寫一份 lock/unlock，各自直接改 document.body.style.overflow。
    // 兩個互不知情的擁有者搶同一個全域資源，先關的那個會把還開著的那個一起解鎖。
    // 後來抽成共享計數器；現在連計數器都不必了 —— `:has()` 是宣告式的 OR，狀態就在 DOM 上，不可能失衡。
    // 而且這條規則不認識任何元件 class：`:modal` 是原生的（showModal 開出來的），
    // `[data-scroll-lock]` 是宣告式契約。js 只剩「量捲軸寬度」那件 CSS 做不到的事。
    const css = read("dist/css/main.css");
    assert.ok(css.includes("html:has(:modal)"), "_base.scss 的 :modal 捲動鎖不見了 —— 這條測試在空轉");
    assert.ok(css.includes("html:has([data-scroll-lock].active)"), "_base.scss 少了浮層開關那半邊的捲動鎖");
    // 契約的另一半：至少要有一個元素真的掛了 data-scroll-lock，否則規則永遠不會命中
    const lockers = distHtml.filter((f) => /data-scroll-lock/.test(distDoc(f)));
    assert.ok(lockers.length > 0, "沒有任何 markup 掛 data-scroll-lock —— 手機選單開著時不會鎖捲動");

    const hits = [];
    for (const f of srcJs)
        read(f).split(/\r?\n/).forEach((raw, i) => {
            const line = raw.split("//")[0];
            if (/(document\.body|document\.documentElement)\.style\.(overflow|paddingRight)\s*=/.test(line))
                hits.push(`${f}:${i + 1}  ${line.trim()}`);
            if (/\.style\.setProperty\(\s*["']overflow/.test(line))
                hits.push(`${f}:${i + 1}  用 setProperty 繞過：${line.trim()}`);
        });
    assert.equal(hits.length, 0, `捲動鎖交給 _base.scss 的 :has() 規則：\n${fail(hits)}`);
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
        // {% set %} 資料裡的 { label: "繁中", i18nKey: "key" } 配對（兩種欄位順序都要吃）——
        // 這些 key 渲染成 data-i18n="{{ item.i18nKey }}"，上面的 regex 完全看不到。
        // [^{}] 不准跨物件邊界：header.html 的父項 i18nKey 後面緊接 submenu 的第一個 label，
        // 用 [^}] 會把父 key 配到子 label 上，變成假陽性。
        for (const m of html.matchAll(/label:\s*"([^"]*)"[^{}]*?i18nKey:\s*"([\w.]+)"/g)) record(m[2], m[1].trim(), f);
        for (const m of html.matchAll(/i18nKey:\s*"([\w.]+)"[^{}]*?label:\s*"([^"]*)"/g)) record(m[1], m[2].trim(), f);
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

test("§5 掛 data-open-modal 的鈕不得同時帶業務 hook class（那代表開窗是有條件的）", () => {
    // 第四輪把七顆「點了沒反應」的鈕全接上 data-open-modal，測試全綠地上了線 —— 那七顆
    // 在真 app 都是業務 js 依條件開窗（先設定要刪哪一列、依權限決定開哪一份、驗證失敗才跳）。
    // 靜態 data-open-modal 等於在 markup 裡寫一句謊話，而當時沒有任何測試擋得住。
    //
    // 判準不必列名單：業務 hook class 的定義就是「全站 scss 都找不到它」——它只給 js 認鈕用。
    // 開窗鈕若身上有這種 class，就表示這顆鈕另有 js 主人，開窗不是它唯一的職責。
    // 掃「編譯後的 css」而不是 scss 原始碼：_utilities.scss 的 .mt-#{$n} / .gap-#{$n} / .col-#{$i}-md
    // 是 Sass 插值生成的，原始碼裡只找得到 stem。掃原始碼的話，開窗鈕寫 class="button mt-4"
    // 就會被誤判成「.mt-4 沒有樣式 ⇒ 業務 hook」而爆紅 —— 而 §4 正是鼓勵用這些工具 class。
    const cssClasses = new Set();
    for (const m of read("dist/css/main.css").matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) cssClasses.add(m[1]);
    assert.ok(cssClasses.size > 300, `dist/css/main.css 只掃到 ${cssClasses.size} 個 class —— 這條測試在空轉`);
    const scssClasses = cssClasses;

    let btnCount = 0;
    const hits = [];
    for (const f of distHtml)
        for (const { attrs, raw } of tagsOf(distDoc(f))) {
            if (!/\sdata-open-modal=/.test(" " + attrs)) continue;
            btnCount++;
            const cls = attrs.match(/\sclass=["']([^"']*)["']/);
            for (const c of (cls ? cls[1] : "").split(/\s+/).filter(Boolean))
                if (!scssClasses.has(c))
                    hits.push(`dist/${f}  .${c} 沒有任何樣式 ⇒ 業務 js 掛點：<${raw.slice(0, 70)}`);
        }
    assert.ok(btnCount > 0, "dist 裡一顆 data-open-modal 都掃不到 —— 這條測試在空轉");
    assert.equal(hits.length, 0, `有條件的開窗是業務邏輯，拿掉 data-open-modal、留 hook class 就好（§5）：\n${fail(hits)}`);
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

test("§4 每個 <dialog> 在它所在的那一頁上都有辦法被打開（反向：不留看不到的彈窗）", () => {
    // 正向測試（開窗鈕→dialog）擋的是「點了沒反應」；反向擋的是「這個彈窗誰都看不到」。
    // 1-2-1 的 previewModal 就這樣沒人見過：真實頁靠業務 js 開，而元件庫頁根本沒 include 它。
    //
    // 一個 <dialog> 算「打得開」有三條路，任一條成立即可，都不必開具名例外：
    //   (a) 同一頁上有 data-open-modal 指向它 —— 無條件開窗
    //   (b) 有元件 js 呼叫 openModal("它")（每頁都載入全部元件 js，故與頁無關）
    //   (c) 元件庫頁上有它的示範觸發器 —— 真實頁上「業務 js 依條件開」的彈窗走這條
    //       （先設定要刪哪一列的名字、依模型權限決定開哪一份、驗證失敗才跳）。那些觸發鈕
    //       保留真 app 的 hook class、不掛 data-open-modal，掛了就是在 markup 裡說謊。
    const attrOpeners = (html) =>
        new Set([...html.matchAll(/data-open-modal=["']([^"']+)["']/g)].map((m) => m[1]));

    const jsOpened = new Set();
    for (const f of srcJs)
        for (const m of read(f).matchAll(/openModal\(\s*["']([^"']+)["']/g)) jsOpened.add(m[1]);
    const demoOpeners = attrOpeners(read("dist/component.html"));

    let dialogCount = 0;
    const hits = [];
    for (const f of distHtml) {
        const html = read(`dist/${f}`);
        const samePage = attrOpeners(html);
        for (const m of html.matchAll(/<dialog[^>]*\sid=["']([^"']+)["']/g)) {
            dialogCount++;
            const id = m[1];
            if (samePage.has(id) || jsOpened.has(id) || demoOpeners.has(id)) continue;
            hits.push(`dist/${f}  <dialog id="${id}"> 這一頁上打不開它，元件庫頁也沒有示範觸發器`);
        }
    }
    assert.ok(dialogCount > 0, "dist 裡一個 <dialog> 都掃不到 —— 這條測試在空轉");
    assert.ok(demoOpeners.size > 0, "元件庫頁一個 data-open-modal 都掃不到 —— 這條測試在空轉");
    assert.equal(hits.length, 0, `看不到的彈窗（元件庫頁要放示範觸發器）：
${fail(hits)}`);
});

test("§5 markup 零 inline 事件處理器 / javascript: href（行為住在元件 js 裡）", () => {
    // 要在 markup 宣告行為就掛資料屬性（data-open-modal / data-toast），由 owning 元件的 js 事件委派。
    // `javascript:` href 同樣是把 js 塞進 markup（`javascript:void(0)` 更是一顆死連結）。
    const stripNjk = (s) => s.replace(/\{#[\s\S]*?#\}/g, "");
    const hits = [];
    for (const f of srcHtml)
        for (const { tag, attrs, raw } of tagsOf(stripNjk(read(f)))) {
            // HTML 屬性大小寫不敏感：onClick= 是合法的 inline handler，沒有 i flag 就抓不到
            if (/\son[a-z]+\s*=/i.test(" " + attrs)) hits.push(`${f}  inline handler: <${tag} ${raw.slice(0, 60)}`);
            if (/=\s*["']javascript:/i.test(attrs)) hits.push(`${f}  javascript: href: <${tag} ${raw.slice(0, 60)}`);
        }
    assert.equal(hits.length, 0, `改掛 data-open-modal / data-toast，或綁在元件 js 裡：\n${fail(hits)}`);
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

test("§9 showcase 色盤 _guideline-var.scss 的 light 與 dark 也必須有完全相同的 token 集合", () => {
    // 曾經整組 --gl-* 只有淺色值：頁面裡的 app 元件會自己換膚，showcase 的 chrome 不會，
    // 於是深色下 app 的 --text 疊在白色的 --gl-bg 上，整頁散文的對比只有 1.6:1。
    // 它跟 _var.scss 一樣是色源檔，一樣要兩邊給滿。
    const src = read("src/scss/_guideline-var.scss");
    const at = (re) => { const i = src.search(re); assert.ok(i >= 0, `找不到 ${re} —— 這條測試在空轉`); return i; };
    const blockAt = (start) => {
        let depth = 0;
        for (let i = src.indexOf("{", start); i < src.length; i++) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}" && --depth === 0) return src.slice(start, i);
        }
        throw new Error("_guideline-var.scss 大括號不平衡");
    };
    const tokens = (body) => new Set([...body.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]));
    const light = tokens(blockAt(at(/^\.guideline-page\s*\{/m)));
    const dark = tokens(blockAt(at(/^\[data-theme="dark"\]\s+\.guideline-page\s*\{/m)));
    assert.ok(light.size >= 10, `只掃到 ${light.size} 顆 --gl-* —— 這條測試在空轉`);
    const onlyLight = [...light].filter((t) => !dark.has(t));
    const onlyDark = [...dark].filter((t) => !light.has(t));
    assert.deepEqual({ onlyLight, onlyDark }, { onlyLight: [], onlyDark: [] }, "showcase 頁的深色模式會靜默壞掉");
});

test("§4 .form-control.search / .time 必須是 .field 的直接子元素（圖示畫在 .field::after）", () => {
    // 放大鏡／時鐘是 `.field:has(> .form-control.search)::after`。搬出 `.field`、或中間多包一層，
    // 圖示就無聲消失（沒有樣式會紅、沒有測試會抓）—— 這裡把那個前提釘住。
    const hits = [];
    let seen = 0;
    for (const f of srcHtml) {
        const html = read(f);
        // 逐個 <input …class="… search|time …"> 往前找最近的開標籤
        for (const m of html.matchAll(/<input\b[^>]*class="([^"]*\bform-control\b[^"]*)"[^>]*>/g)) {
            const cls = m[1].split(/\s+/);
            if (!cls.includes("search") && !cls.includes("time")) continue;
            seen++;
            const before = html.slice(0, m.index);
            const lastOpen = before.lastIndexOf("<div");
            const tag = before.slice(lastOpen, before.indexOf(">", lastOpen) + 1);
            // 直接父層必須是 <div class="field">，且兩者之間不得再有別的開標籤
            const between = before.slice(before.indexOf(">", lastOpen) + 1);
            if (!/class="[^"]*\bfield\b/.test(tag) || /<[a-z]/.test(between))
                hits.push(`${f}: ${m[0].slice(0, 70)}… 的直接父層是 ${tag.slice(0, 50)}`);
        }
    }
    assert.ok(seen >= 5, `只掃到 ${seen} 個 search/time 輸入框 —— 這條測試在空轉`);
    assert.equal(hits.length, 0, `圖示會消失：\n${hits.join("\n")}`);
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
    //
    // 掃**編譯後**的 css 而非 scss 源碼：mixin 展開後的宣告（icon-mask 的 background-color）
    // 在源碼裡看不到，掃源碼等於放它過關。
    //
    // 被遮罩的元素豁免：遮罩把整個 background 裁成字形，那顆顏色是**墨色**（前景），
    // 它承載不了任何文字 —— 本規則的前提（「白字疊上去會讀不到」）在那裡不成立。見 §4「遮罩圖示」。
    // 「有沒有被遮罩」是層疊的性質，不是單一規則的性質：`.button-icon.edit::before` 宣告遮罩，
    // 而 `.button-icon.no-bg:hover.edit::before` 只覆寫顏色。故判準是「這個 compound 是不是
    // 某條帶遮罩 compound 的細化（simple selector 的超集）」，而不是「這條規則裡有沒有 mask:」。
    const TEXT = COLOR_ROLES.textOnSurface.map((t) => t.slice(2)).join("|");
    const PROP = "background(?:-color)?|border(?:-color|-top|-right|-bottom|-left|-block|-inline)?|box-shadow|fill|stroke";
    const re = new RegExp(String.raw`(?:^|[\s;{])(?:${PROP})\s*:[^;]*var\(--(?:${TEXT})\)`);
    const css = read("dist/css/main.css");

    // 只看最後一個 compound（那才是被畫的元素），拆成 simple selector 的集合
    const compound = (sel) => {
        const last = sel.trim().split(/\s*[>+~]\s*|\s+/).pop() || "";
        return new Set(last.match(/::[\w-]+|:[\w-]+(?:\([^)]*\))?|\.[\w-]+|#[\w-]+|\[[^\]]*\]/g) || []);
    };
    const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
        sels: sel.split(",").map((s) => s.trim()).filter(Boolean),
        body,
    }));
    assert.ok(blocks.length > 300, `只解析到 ${blocks.length} 條規則 —— 這條測試在空轉`);

    const masked = [];
    for (const { sels, body } of blocks) {
        if (/(?:^|[\s;])(?:-webkit-)?mask\s*:/.test(body)) for (const s of sels) masked.push(compound(s));
    }
    assert.ok(masked.length > 0, "找不到任何帶遮罩的規則 —— 豁免條件在空轉");
    const isMasked = (sel) => {
        const own = compound(sel);
        return masked.some((m) => [...m].every((t) => own.has(t)));
    };

    const hits = [];
    for (const { sels, body } of blocks) {
        for (const decl of body.split(";")) {
            if (!re.test(";" + decl)) continue;
            for (const s of sels) if (!isMasked(s)) hits.push(`${s.replace(/\s+/g, " ")} { ${decl.trim()} }`);
        }
    }
    assert.equal(hits.length, 0, `白字疊上去會讀不到：\n${hits.join("\n")}`);
});

// §4「新增或調整任何顏色都要重算這兩個數字」——與其相信 _var.scss 的手寫註解（前面已抓到兩個
// 憑感覺寫的數字），不如每次 CI 實算。分類是**窮舉**的：新增一顆顏色 token 若沒歸類，測試就紅。
const COLOR_ROLES = {
    // 有色填充：疊白字 --on-accent 要 ≥4.5:1，且填充對底色 ≥3:1（WCAG 1.4.11）
    fillOnWhiteText: ["--brand", "--brand-hover", "--success", "--success-hover", "--danger", "--danger-hover",
        "--info", "--accent-orange", "--accent-orange-hover", "--accent-teal", "--accent-teal-hover"],
    // 黃底：天生太亮 —— 放不下白字，對淺色底也拉不開 3:1。改配 --on-warning 深字，兩個門檻一起豁免（§4）
    fillOnDarkText: ["--warning"],
    // 當內文用：疊 --surface / --surface-raised 要 ≥4.5:1
    textOnSurface: ["--text", "--text-strong", "--text-muted", "--brand-text", "--brand-text-hover", "--danger-text",
        "--success-text"],
    // 前景墨色：文字與「不承載文字的圖形記號」（勾記、radio 圓點、進度條、步驟底線）共用一顆。
    // 它是前景不是填充，故套文字的 ≥4.5:1 門檻（自然也滿足圖形的 1.4.11 ≥3:1）。見 §4。
    inkOnSurface: ["--brand-ink"],
    surfaces: ["--surface", "--surface-raised", "--surface-sunken", "--surface-hover", "--surface-disabled", "--surface-input"],
    // 成對的：[前景, 背景] 要 ≥4.5:1。只列 markup 裡真的疊在一起的組合 ——
    // token 的宣告只保證它疊在 --surface / --surface-raised 上讀得到，疊到 hover 面或 tint 面就得另外算。
    pairs: [
        ["--tooltip-text", "--tooltip-bg"],
        ["--brand-ink", "--brand-tint"], // multi-select .selected、tab .on-record.active
        ["--brand-text-hover", "--surface-hover"], // header-controls 的語言鈕 hover
    ],
    // 圖形記號／元件邊界：不承載文字，門檻 3:1（WCAG 1.4.11）。一樣只列真的疊在一起的。
    // 曾經：這幾顆全被當成 chrome 而完全豁免，深色 switch 的把手疊在綠軌上只有 2.60、軌道對卡片只有 1.75。
    graphicPairs: [
        ["--control-knob", "--toggle-on", "switch ON 把手 vs 軌道"],
        ["--control-knob", "--control-track", "switch OFF 把手 vs 軌道"],
        ["--control-track", "--surface-raised", "switch OFF 軌道 vs 卡片"],
        ["--toggle-on", "--surface-raised", "switch ON 軌道 vs 卡片"],
        ["--brand-ink", "--control-track-alt", "storage-bar 填色 vs 空軌"],
    ],
    // chrome 零件：不承載內文，不做內文對比斷言（邊框/捲軸/tint/陰影/遮罩/漸層）。
    // --control-track-alt 是 storage-bar 填色後面的軌道：資訊由「填色 vs 軌道」承載（已在 graphicPairs），
    // 軌道本身對卡片只是一條淡導軌，不是要辨識的圖形物件。
    chrome: ["--on-accent", "--on-warning", "--border", "--border-subtle", "--brand-tint",
        "--scrollbar-thumb", "--scrollbar-thumb-strong", "--control-track", "--control-track-alt",
        "--control-knob", "--toggle-on", "--pattern-tint",
        "--shadow", "--shadow-strong", "--overlay", "--overlay-disabled", "--overlay-tint", "--brand-gradient"],
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

    const { fillOnWhiteText, fillOnDarkText, textOnSurface, inkOnSurface, surfaces, pairs, graphicPairs, chrome, nonColor } = COLOR_ROLES;
    const needsHex = new Set([
        ...fillOnWhiteText, ...fillOnDarkText, ...textOnSurface, ...inkOnSurface, ...surfaces,
        ...pairs.flat(), ...graphicPairs.flatMap(([a, b]) => [a, b]),
    ]);
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
        for (const [fg, bg, label] of graphicPairs) check(ratio(fg, bg), 3, `${label}（${fg} / ${bg}）`);
    }
    assert.equal(bad.length, 0, `WCAG AA / 1.4.11：\n${fail(bad)}`);
});

test("§4 遮罩圖示的墨色只能來自文字族／前景墨色（填充族與 chrome 都不行）", () => {
    // 「文字族不可當填充」那條測試放行了所有被遮罩的元素——但它只是**豁免**，沒有斷言墨色來自哪個角色。
    // 於是填充族（--success）與 chrome（--border）都曾偷偷跑進來當墨色：
    //   --success 是為了襯白字而壓深的填充，當前景在深色下只有 3.41:1；
    //   --border 是邊框色，當箭頭是 1.3:1 —— 兩者都通過了全部 60 條測試。
    // 遮罩把 background 裁成字形 → 那顆顏色是**前景**，門檻與內文相同（§4：一顆 token 只能有一個角色）。
    const allowed = new Set([...COLOR_ROLES.textOnSurface, ...COLOR_ROLES.inkOnSurface]);
    const css = read("dist/css/main.css");

    const compound = (sel) => {
        const last = sel.trim().split(/\s*[>+~]\s*|\s+/).pop() || "";
        return new Set(last.match(/::[\w-]+|:[\w-]+(?:\([^)]*\))?|\.[\w-]+|#[\w-]+|\[[^\]]*\]/g) || []);
    };
    const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
        sels: sel.split(",").map((s) => s.trim()).filter(Boolean),
        body,
    }));
    const masked = [];
    for (const { sels, body } of blocks)
        if (/(?:^|[\s;])(?:-webkit-)?mask\s*:/.test(body)) for (const s of sels) masked.push(compound(s));
    assert.ok(masked.length >= 10, `只找到 ${masked.length} 條帶遮罩的規則 —— 這條測試在空轉`);
    const isMasked = (sel) => { const own = compound(sel); return masked.some((m) => [...m].every((t) => own.has(t))); };

    const hits = [];
    let checked = 0;
    for (const { sels, body } of blocks) {
        for (const decl of body.split(";")) {
            const m = decl.match(/(?:^|[\s{])background-color\s*:\s*var\((--[\w-]+)\)/);
            if (!m) continue;
            for (const s of sels) {
                if (!isMasked(s)) continue;
                checked++;
                if (!allowed.has(m[1]))
                    hits.push(`${s.replace(/\s+/g, " ")} 的墨色是 ${m[1]}（它的角色不是文字／前景墨色）`);
            }
        }
    }
    assert.ok(checked >= 10, `只檢查到 ${checked} 個遮罩墨色 —— 這條測試在空轉`);
    assert.equal(hits.length, 0, `遮罩的顏色是前景，門檻同內文：\n${hits.join("\n")}`);
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
