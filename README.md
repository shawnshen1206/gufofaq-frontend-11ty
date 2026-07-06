# GufoFAQ Frontend — 11ty（react-friendly 切版）

GufoFAQ 前端的 **Eleventy (11ty) 切版專案**。由原本的 HTML + jQuery 切版（`GufoFAQ_Frontend_New`）依 [`GUIDELINE.md`](GUIDELINE.md) 的規範轉成——**一元件一資料夾、SCSS 照抄、jQuery 換成原生 DOM、無任何第三方前端套件**。

這份專案有兩個用途：

1. **設計師協作 base**：以後切新頁 / 改元件，都在這裡照 `GUIDELINE.md` 的方式做（不要回去改舊的 jQuery 專案）。
2. **轉 React 的來源**：結構刻意做成能近乎機械式地轉成 React（見 `GUIDELINE.md` §7）。

---

## 開始

需求：**Node 20+**。

```bash
npm install

npm run dev      # 開發：eleventy --serve + sass --watch 並行，改 html/scss 即時重載（http://localhost:8080）
npm run build    # 產出：編譯 scss + eleventy → dist/
```

build 後每頁都在 `dist/` 根（如 `dist/component.html`、`dist/2-1_qaRecord.html`），雙擊或用任何靜態伺服器即可開。**想一頁看完所有元件 → 開 `dist/component.html`（元件總覽 / style guide）。**

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
│                            chatroom, sources-block(+source-row), qa-detail-info, multi-select-box,
│                            block, chart-box, countdown-box, storage-bar, editable-block,
│                            select-btn-wrap, success-box, feature-disabled-overlay, login-wrapper,
│                            以及 9 個具體 *-modal
├── scss/
│   ├── _var.scss           顏色 / 字型 tokens（:root CSS 變數）
│   ├── _mixin.scss  _normalize.scss  _base.scss  _utilities.scss
│   ├── _style.scss         第二份頁面樣式（原 style.css）
│   ├── _guideline.scss     元件總覽頁專用樣式
│   └── main.scss           @use 組裝清單（新增元件在這加一行）
├── images/                 圖片資產
├── index.html              登入頁（src/ 根，與 pages/ 同層）
└── pages/                  內頁：依 section 分資料夾，permalink 輸出扁平檔名（全站含登入頁共 23 頁）
    └── dataImport/ dataset/ qaHistory/ qaRecord/ qaTest/ settings/ components/
dist/                       build 輸出（勿手改）
```

一元件一資料夾：`<name>/<name>.html` + `_<name>.scss`（有才放）+ `<name>.js`（有才放）。

---

## 慣例（完整規範見 [`GUIDELINE.md`](GUIDELINE.md)）

- **SCSS 照抄、絕不手改**：交付的 SCSS 就是正式最終樣式。顏色用 `_var.scss` 的 `var(--color-*)`，**禁止 inline 顏色/字級**。
- **class 命名沿用既有系統**；狀態用 class（`.active/.open/.done/.error/.disabled`）。
- **模板只用 4 種語法**：front matter、`{% include %}`、`{% set %}`、`{% for %}`(+`{% if %}`)。（HTML 註解 `<!-- -->` 內**不要**寫 `{% %}`/`{{ }}`——會被 nunjucks 解析；要註解模板碼用 `{# #}`。）
- **JS 只用標準 DOM API**，行為跟元件住一起；**禁 jQuery 與任何第三方套件**。
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

交付前跑 `npm run build` 確認綠、`dist/` 每頁外觀與互動正確、無 jQuery / 第三方套件。

---

## 轉 React

見 `GUIDELINE.md` §7：`layouts/page-shell` → route `layout.tsx`；`ui|components/<name>/` → `Xxx.tsx` + 同名 scss（**原樣複製**）；`{% include %}`→`<Comp/>`、`{% set %}`→props、`{% for %}`→`.map()`、`<name>.js` 行為→`useState`；`.open/.active` 狀態 class → `className={open ? 'x open' : 'x'}`。
