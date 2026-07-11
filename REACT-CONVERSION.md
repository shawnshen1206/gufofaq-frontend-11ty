# SCSS 切版 → React 轉換配方（給轉換 agent）

**目的**：把 11ty + SCSS 切版轉成 **React + 元件級 SCSS**（scss 逐字照抄、保留 `.scss`，不轉 utility；
零 CSS + Tailwind 是姊妹檔 [`TAILWIND-CONVERSION.md`](./TAILWIND-CONVERSION.md)）。React 與切版**逐像素一致**，只機械轉寫。

**產出契約**：每個 `src/_includes/{ui,components}/<name>/`（`<name>.html`+`<name>.js`+`_<name>.scss`）
→ `<Name>.tsx` + `<Name>.scss`。scss `scss-diff.mjs` exit 0；tsx 從切版 html+js 重寫；對 `dist/` 用 `fpdiff.mjs` 驗收。
**值以實際 `_<name>.scss` / `<name>.html` / `dist/` 為準**（本文件是規則，不是值的清單）。

順序：**⓪ 重寫 → ① scss → ② markup → ③ i18n → ④ 行為 → ⑤ 原生機制 → ⑥ 驗收**。

---

## ⓪ 從切版整份重寫

- 每個元件從切版 `<name>.html` + `<name>.js` + `_<name>.scss` 整份重寫。
- 現況 `apps/web` 只讀 **consumer 介面**（props 被哪些頁面用），實作不參考。
- 從現況保留的只有 **React 應用層**：權限過濾、`fetch`、路由、Next 慣例。
- 重建到符合切版的正確路徑／命名（`ui/` 原子→`components/ui/`）：consumer 改用新元件、刪掉走樣舊檔，不留新舊兩套。
  （現況常有 undefined token 的走樣舊檔仍被 consumer import——那正是要退休的那份。）
- 寄生 orphan class：某元件 `.scss` 裡出現、但它自己 tsx/markup 從不 render 的 selector，是別的 atom 寄生進來的——
  追回它切版的 `ui/` atom、抽成獨立 `components/ui/<Name>/`、退掉寄生（例：`.data-info` 曾寄生在 `Pagination.scss`）。
- 走樣 scss 若把 hook class 選擇器寫成裸元素（如 `button:hover .tooltip` 而非 `.has-tooltip:hover .tooltip`），修回
  切版選擇器時 grep 所有 consumer、在觸發元素補上該 hook class——consumer 常是靠走樣的裸選擇器意外運作、自己沒掛 class。
- 舊 jQuery 真 app 不看。

## ① scss（byte-identical）

- 逐字照抄 `_<name>.scss`，**含切版原有註解**。唯二差異：`@use` 路徑深度、`url(../images/…)`→`url(/images/…)`。
- 顏色走 `_var.scss` 語意 token，零裸 hex／裸色。填充用 `--brand`、文字用 `--brand-text`、遮罩墨色取文字族。
- 逃生口（捲軸、偽元素、`icon-mask`、`@starting-style`、`border-image` 漸層、`writing-mode`）隨 scss 照抄。
- 全域層 `src/scss/{_var,_base,_mixin,_utilities,_normalize,_form-check,_dark-icons,_size}` → `styles/`；
  `main.scss` 只放全域層 `@use`，元件 scss 由各自 tsx `import "./X.scss"`。
- `@use`／`url()`／`icon-mask(...)` 的路徑在原行就地替換，不插入額外說明行（scss-diff 逐行比對）。
- `scss-diff.mjs` exit 0。

## ② markup（html → tsx）

- `class`→`className`、`for`→`htmlFor`、`{# #}`→`{/* */}`、自閉合。
- `{% include "x.html" %}`→`<X/>`、`{% for a in xs %}`→`{xs.map(a=>…)}`、`{% if c %}`→`{c && …}`／三元、`{% set %}`→props。
- markup 完整照切版：wrapper、`aria-*`、`title` 全數帶到。
- a11y 綁定屬性成對帶：`aria-labelledby`／`aria-describedby` 連同它指到的 `id` 一起轉，兩端缺一不可
  （如 `<dialog aria-labelledby="x-title">` 配 `<h3 id="x-title">`），id 隨呼叫端 prop 衍生時兩處同一份運算式。
- 命名：kebab（`mobile-nav`）→ PascalCase 資料夾＋同名 tsx/scss；`ui/` 原子→`components/ui/`，大元件→`components/`。
- 元件形態：純 CSS class 貼到任意 element（如 `.block`）→ **scss-only**（無 tsx，consumer 手寫 className）；
  固定 markup + variant（如 `span.divider-vertical`、`ul.list-style-disc`）→ **tsx wrapper**（variant→props、內容→children）。
- 切版 `<name>.html` 只是 component.html 的 demo 片段（無 nunjucks 參數、literal demo copy）時，tsx 做 generic
  props wrapper，demo 內容（示範文案/示例項）放 gallery，不 baked 進元件。
- 切版 template 產生的縮排空白文字節點：改切版消除，React 不補死節點。

## ③ i18n（react-i18next）

- `data-i18n="k">文<`→`{t("k")}`；`data-i18n-title="k"`→`title={t("k")}`（`data-i18n-aria-label`/`data-i18n-alt`/
  `data-i18n-placeholder` 對到對應屬性）：帶 `data-i18n-<attr>` 的屬性一律用 `t()` 譯值，不是原文 label／資料值——
  同一顆節點的文字走 `t()`、屬性卻留原文 label 是常見漏網（沒有 `data-i18n-*` 標記的屬性才維持原文）。
- markup 不掛 `data-i18n`／`.js-lang-toggle`。
- 語言鈕標籤顯示要切去的語言（en→「中」、zh→「EN」，不進字典）；點擊 `i18n.changeLanguage` + `localStorage("lang")` +
  同步 `document.documentElement.lang`（`en`→`"en"`，否則`"zh-Hant"`）——不是只有 `<head>` no-flash 腳本首次載入設一次。
- i18n init `lng="zh"`；client mount 後依 `localStorage("lang")` `changeLanguage`。
- 主題：`<head>` no-flash inline script 設 `data-theme`（照抄 `base.html` 的 IIFE）、`<html suppressHydrationWarning>`；
  圖示切換用 scss `display: var(--theme-icon-*)`，元件不讀 `[data-theme]`；深淺鈕點擊同步 `data-theme`
  （同語言鈕：live 切換要即時同步 `<html>` 屬性，不能只靠首次載入的 no-flash 腳本）。

## ④ 行為（vanilla js → hooks）

- 轉行為前讀 `<name>.js` **全文**，次要的無障礙同步也要一併轉。例：桌機下拉是純 CSS `:hover`／`:focus-within`，
  但 `header.js` 另用 `mouseenter`／`focusin` 把 `aria-expanded` 同步成子選單是否顯示（CSS 改不了 ARIA）。
- vanilla 事件 → `useState` + `onClick/onChange`。
- `data-open-modal`／`data-toast`／`data-print` → `onClick`；移除屬性、不自創 hook class、不留 document 委派。
- `GufoSlide`→`useSlideToggle`、`showToast`→`useToast()`、`openModal`→受控 `<Modal>`、`aria-expanded`→綁 state。
- 捲動鎖：開關掛 `data-scroll-lock`（`html:has([data-scroll-lock].active)` 在 `_base.scss`）。
- 業務 hook class（`.watchBtn`／`.copyBtn`／`.js-apply-production`…）保留。
- 業務邏輯（抓資料／SSE／圖表／表單驗證／日期）不轉。

## ⑤ 平台原生機制保留

- `<dialog>`／`popover`／`:has()`／`@starting-style`／`allow-discrete`／`mask`／`dvh` 保留，不改成 div + state。
- `.js-*` 不帶；`fpdiff.mjs` element identity 排除 `.js-*`。

## ⑥ 視覺指紋驗收

- `scss-diff.mjs`：去路徑映射後 byte-identical。
- `fpdiff.mjs`：幾何（x/y/w/h/display/元素增減）零容忍；a11y 結構屬性（`role`／`aria-labelledby`／
  `aria-describedby`／`aria-haspopup`／`aria-expanded`、以及被某個 `aria-*by` 引用到的元素 `id`）跟幾何同級零容忍
  （值是結構性 id/常數，不隨語言變）；繪製白名單只含資產路徑 + i18n 文字；`title`／`aria-label`／`alt`／`placeholder`
  這類值隨語言翻譯的屬性不進零容忍比對（fpdiff 對照的切版 dist 跟 React 開發模式預設同語言，比不出翻譯錯誤，
  靠 §③ 規則 + code review 把關）；`--component` normalize 元件絕對位置；`--legacy-eval`／`--react-eval` 開隱藏元件；
  排除 `.js-*`；both-empty／loadFail 守門。
- full-width 元件：gallery 展示槽用切版展示頁的同一條寬度算式
  （`.full-container`：aside 200px + main `calc(100% - 200px)` + padding 1rem + border-box）。
- 兩側資料前提不對等時（如 React 保留 `/api/me` 權限過濾、切版 `dist` 永遠無過濾）：用 `--react-route="<urlGlob>|<json>"`／
  `--legacy-route=`（`goto` 前 `page.route()` 攔截、回一致資料）對齊資料再比幾何；不放寬 (A)-(D) 判準。
- WAAPI 動畫（如 `useSlideToggle` 300ms slide）open-state 截圖：`--legacy-eval`／`--react-eval` 用 async IIFE
  觸發後 `await` 超過動畫時長的 timeout（例 `(async()=>{el.click();await new Promise(r=>setTimeout(r,500))})()`），兩側同腳本同等待。
- 互動型 `--react-eval`（點 checkbox/switch 觸發 `:checked`）：`await` 要在 click **之前**——`page.goto(waitUntil:"load")`
  可能在 React hydrate 完成前返回，same-tick click 落在 onChange 綁定前會被吞、fpdiff deterministic fail；寫成
  `(async()=>{await new Promise(r=>setTimeout(r,500));el.click()})()`（await 在 click 前，不是 after）。
- `:hover` 態（tooltip 等）不能用 `--*-eval` 造（瀏覽器原生偽類、`page.evaluate` 觸發不了）：用 Playwright 真
  `page.hover()` + 兩側 computed-style 比對（等 opacity transition 跑完再量）驗 hover 顯示。
- gallery demo 別把消歧用的額外 class 加在 fpdiff 根元素上（element identity 會判成增減）——用不參與比對的
  外層 wrapper scope。
- 對照切版 `component.html`（showcase 頁）時，`body.guideline-page`（`_guideline.scss` 的 showcase chrome）會對 demo 也用的
  通用 class（`.flex-row`/`.subtitle` 等）加樣式，造成 residual diff——那是展示頁 chrome bleed、非元件 bug。比對聚焦元件自身
  子樹（如 `.form-group`），別框到 demo wrapper。
- 新規則附負控 + 空轉守門；能白名單就別黑名單。
- 一列多個示範元素只實作部分時，fpdiff 對每顆各自下 `:nth-child(N)` selector（`document.querySelector` 單 root）。

---

## 機械對照（元件常見）

- Button：`.button`（文字按鈕，variant 走 `.button-{primary,border,green,red,dark,orange}` + `.button-sm`）
  與 `.button-icon`（遮罩圖示按鈕：copy/watch/edit/delete/download/save/cancel/like/dislike/share +
  `.no-bg` + `.size-sm`）雖同檔 scss、byte-identical 一起照抄，但是**兩種獨立元件**，不是同一元件的
  variant——`.button-icon` 不吃 `.button` 的 padding/border/背景樣式，用途也是純圖示鈕。`<Button>` 只做
  `.button` 文字按鈕；`.button-icon` 走獨立 `<IconButton>`（或消費端直接寫 class，見既有 consumer 用法）。
- disabled 態：切版靜態 demo 常見 `.disabled` class 與 `disabled` 屬性並存（scss 選擇器也是
  `&.disabled, &:disabled` 兩個都認）——這是給 `<a>` 這類無法帶原生 `disabled` 屬性的偽按鈕用的樣式門檻。
  原生 `<button disabled>` 元件不必自動疊加 `.disabled` class（`:disabled` 偽類已同義、消費端只傳
  `disabled` 即可）；gallery 展示若要讓 fpdiff 逐字比對切版 class 清單，用 `className="disabled"` 手動疊加。
- 斷點：切版 max-width mobile-last；`nav-collapsed` 1250px（header ↔ mobile-nav 同值，收在 `_mixin.scss`）。
- Header：`.header-right` 包 desktop-nav + `.header-controls-slot` + nav-toggle；nav-collapsed 時 `.header-controls-slot` 收起。
- MobileNav：`.mobile-menu-wrap` 與各子選單用 `useSlideToggle`；子選單拆子元件（hook 不入 `.map()`）；
  收合整個選單時子選單 `setImmediate(false)` 零動畫、同時把子選單 open state 設回 `false`（同步 `aria-expanded`）。
- Modal：受控 `<dialog>`，effect 依 `open` 呼 `showModal()`／`close()`。
- useSlideToggle：介面 `(open) → { ref, setImmediate }`；mount 首次不動畫。

## 測試設定

- `vitest.config.ts` 的 `resolve.alias` 補 `tsconfig.json` `paths` 的 `@/` 映射（Vitest 底層 Vite 不自動套 tsconfig paths）。

## 驗收

逐元件對 `dist/component.html` 用 `fpdiff.mjs` 比幾何 + 繪製；scss 對 `_<name>.scss` 用 `scss-diff.mjs` 比 byte-identical。
確認：tsx 從切版重寫、scss byte-identical、原生機制保留、i18n 走 react-i18next、`.js-*`／`data-i18n` 未帶。
