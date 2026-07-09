# GufoFAQ Frontend — 11ty（react-friendly 切版）

GufoFAQ 前端的 **Eleventy (11ty) 切版專案**。由原本的 HTML + jQuery 切版（`GufoFAQ_Frontend_New`）依 [`GUIDELINE.md`](GUIDELINE.md) 的規範轉成——**一元件一資料夾、SCSS 照抄、jQuery 換成原生 DOM、無任何第三方前端套件**。

這份專案是 GufoFAQ 前端切版的**唯一正本**（原 jQuery 專案只是歷史出處，不再回頭對齊），有兩個用途：

1. **切版正本**：以後切新頁 / 改元件，都在這裡照 `GUIDELINE.md` 的方式做。
2. **轉 React 的來源**：結構刻意做成能近乎機械式地轉成 React（見 `GUIDELINE.md` §7）。

---

## 開始

需求：**Node 20+**（`package.json` 的 `engines` 有擋；`.nvmrc` 寫 22，CI 也讀它）。

```bash
npm install

npm run dev      # 開發：eleventy --serve + sass --watch 並行，改 html/scss 即時重載（http://localhost:8080）
npm run build    # 產出：編譯 scss + eleventy + 替資產加 content hash → dist/
npm run lint:css # stylelint：把關「零裸 hex／零裸色彩函式」（顏色只准用 _var.scss 的語意 token）
npm run check    # 交付前跑這個：lint:css + build
```

`build` 最後會跑 `scripts/hash-assets.mjs`，替 `css`/`js`/`i18n` 加上 `?v=<content hash>` 查詢字串——GitHub Pages 的資產檔名固定又有邊緣快取，沒有這步的話改版後使用者會拿到「新 HTML + 舊 CSS/JS」。內容沒變 hash 就不變（冪等）。

build 後每頁都在 `dist/` 根（如 `dist/component.html`、`dist/2-1_qaRecord.html`），雙擊或用任何靜態伺服器即可開。**想一頁看完所有元件 → 開 `dist/component.html`（元件總覽 / style guide）。**

---

## 部署（GitHub Pages）

push 到 `master` 會自動觸發 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：`npm ci` → `npm run lint:css`（違規就擋下部署）→ `npm run build` → 把 `dist/` 發布到 GitHub Pages。也可在 GitHub 的 **Actions** 頁手動觸發（workflow_dispatch）。

- **線上網址**：<https://shawnshen1206.github.io/gufofaq-frontend-11ty/>（進站是**頁面目錄**，可點去任一頁；登入頁在 `/login.html`、元件總覽在 `/component.html`）。
- **一次性設定**：repo → **Settings → Pages → Build and deployment → Source** 選「**GitHub Actions**」。沒開的話 deploy job 會以 404 失敗（訊息會提示要啟用 Pages），開啟後對該次重跑（Re-run jobs）即可。
- `dist/` 在 `.gitignore` 內、不進版控——由流程現建現部署，不需 `gh-pages` 分支。
- 全站用相對路徑，在 `/gufofaq-frontend-11ty/` 子路徑下可直接運作，不需額外 base path 設定。
- 官方 Pages artifact 部署不跑 Jekyll，且 `dist/` 無 `_` 開頭檔，故不需 `.nojekyll`。

---

## 結構

```
src/
├── _includes/
│   ├── layouts/            整頁模板：base.html（純外框）、page-shell.html（header+main+footer 外殼）
│   ├── ui/                 小元件（原子）：button, form-control, checkbox, radio, switch,
│   │                        multi-select, tab, accordion, pagination, breadcrumb, tooltip,
│   │                        link-file, link-modal, list-style, toast, modals, divider-vertical
│   └── components/         大元件：header, mobile-nav, footer, disclaimer-modal,
│                            default-table, priority-table, form-table, upload-*, step-*,
│                            chatroom, sources-block, qa-detail-info, qa-record-tabs,
│                            prompt-edit, multi-select-box, block, chart-box, countdown-box, storage-bar,
│                            editable-block, select-btn-wrap, success-box, feature-disabled-overlay,
│                            login-wrapper, file-preview-modal, 以及其餘 *-modal；
│                            純樣式（只有 scss、class 寫在頁面）：filter-fields, prompt-card, ab-test-block
├── scss/
│   ├── _var.scss           顏色 / 字型 tokens（:root CSS 變數，全站唯一顏色定義處）
│   ├── _mixin.scss  _normalize.scss  _base.scss
│   ├── _utilities.scss     工具 class：text-*/flex-row/gap-*/col-*/mt-*/mb-*/my-*/flex-1…
│   ├── _guideline.scss     元件總覽頁專用樣式
│   └── main.scss           @use 組裝清單（新增元件在這加一行）
├── images/                 圖片資產
├── catalog.html            部署站台首頁：頁面目錄（permalink 輸出成 index.html；showcase 用，非 app 一部分）
├── index.html              登入頁原始碼（permalink 輸出成 login.html）
└── pages/                  內頁：依 section 分資料夾，permalink 輸出扁平檔名
    └── dataImport/ dataset/ qaHistory/ qaRecord/ qaTest/ settings/ components/
dist/                       build 輸出（勿手改）
```

一元件一資料夾：`<name>/<name>.html` + `_<name>.scss`（有才放）+ `<name>.js`（有才放）。

---

## 慣例（完整規範見 [`GUIDELINE.md`](GUIDELINE.md)）

- **CSS 免翻譯**：交付的 SCSS 就是正式最終樣式。顏色用 `_var.scss` 的 `var(--color-*)`；**間距 / 顏色 / 字級 / 排版一律用工具或元件 class，不寫 inline style**（間距 `mt-*`/`mb-*`/`my-*`/`gap-*`；表格欄寬 `<col style="width">` 與資料驅動值等少數例外見 §4）。
- **class 命名沿用既有系統**；狀態用 class（`.active/.open/.done/.error/.disabled`）。頁面專屬的一次性樣式也歸戶成純樣式元件，不放全域樣式表。
- **模板只用 4 種語法**：front matter、`{% include %}`、`{% set %}`、`{% for %}`(+`{% if %}`)。（HTML 註解 `<!-- -->` 內**不要**寫 `{% %}`/`{{ }}`——會被 nunjucks 解析；要註解模板碼用 `{# #}`。）
- **JS 只用標準 DOM API**，行為跟元件住一起；**禁 jQuery 與任何第三方套件**。
- **可及性**：圖示按鈕給可及名稱（`title`+`.sr-only` 或 `aria-label`）；label 以 `for`/`id` 關聯（同元件重複出現時用迴圈變數組唯一 id），無可見 label 的控制項加 `aria-label`；HTML 巢狀要合法（`span`/`a` 內不放區塊元素）。
- 不在切版範圍（保留原生元素、之後由 React 套件實作）：日期選擇、多選下拉的資料邏輯、表單驗證、資料載入 / SSE / 圖表。

---

## 怎麼新增

**新元件**：在 `ui/` 或 `components/` 建 `<name>/` 資料夾放 `<name>.html`(+`_<name>.scss`/`<name>.js`)。有 scss → `src/scss/main.scss` 加一行 `@use`；有 js → `eleventy.config.js` passthrough 與 `layouts/base.html` script 鏈各加一行。

**新頁面**：在 `src/pages/<section>/` 建 `<name>.html`，front matter：

```njk
---
layout: layouts/page-shell.html   # 一般頁；登入等特殊頁用 layouts/base.html
title: GufoFAQ::頁面標題
permalink: <name>.html            # 扁平輸出到 dist/ 根
---
{# 頁面內容：用 {% include %} 組合元件、{% set %}+{% for %} 渲染重複列 #}
```

交付前跑 `npm run check` 確認綠（stylelint + build）、`dist/` 每頁外觀與互動正確、無 jQuery / 第三方套件。完整清單見 [GUIDELINE.md §8](GUIDELINE.md)。

---

## 轉 React

見 `GUIDELINE.md` §7：`layouts/page-shell` → route `layout.tsx`；`ui|components/<name>/` → `Xxx.tsx` + 同名 scss（**原樣複製**）；`{% include %}`→`<Comp/>`、`{% set %}`→props、`{% for %}`→`.map()`、`<name>.js` 行為→`useState`；`.open/.active` 狀態 class → `className={open ? 'x open' : 'x'}`。
