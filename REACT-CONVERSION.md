# SCSS 切版 → React 轉換配方（給轉換 agent）

**目的**：把本專案（11ty + SCSS 切版）轉成 **React + 元件級 SCSS**——scss **逐字照抄、保留 `.scss`**，
不轉 utility（零 CSS + Tailwind utility 化是另一份 [`TAILWIND-CONVERSION.md`](./TAILWIND-CONVERSION.md) 的目標，
兩份是對應兩種產出的姊妹配方）。React 端與切版**逐像素一致、凡不同即錯**，只准機械轉寫，**不准創意重寫**。

**你（agent）的產出契約**：
- 每個 `src/_includes/{ui,components}/<name>/`（`<name>.html` + `<name>.js` + `_<name>.scss`）
  → 一個 `<Name>.tsx` + 一個 `<Name>.scss`。
- `<Name>.scss` **逐字照抄** `_<name>.scss`（唯二差異：`@use` 路徑、`url(../images/…)`→`url(/images/…)`）；
  `scss-diff.mjs` 必 **exit 0**。
- `<Name>.tsx` **從切版 `<name>.html`+`<name>.js` 整份重寫**（見 ⓪，不 patch React 現況）。
- 對照 `dist/`（切版 build 後最終外觀）用 `fpdiff.mjs` 逐元件視覺指紋驗收。

轉換順序：**⓪ 重寫不 patch → ① scss 照抄 → ② markup 轉寫 → ③ i18n → ④ 行為 js→hooks → ⑤ 平台原生機制保留 → ⑥ 視覺指紋驗收**。

> 值一律以實際 `_<name>.scss` / `<name>.html` / `dist/` 為準（已對齊真 app）；本文件給的是規則，不是值的清單。

---

## ⓪ 頭號律：從切版整份重寫，絕不 patch 現況

React `apps/web` 是**不知多久前、複製舊切版的走樣廢版**。每個元件從切版
`<name>.html`+`<name>.js`+`_<name>.scss` **整份重寫**，把現況當要丟的舊版。

- 現況只對**一件事**：consumer 介面（props 被哪些頁面用、要向後相容）。**實作零參考現況。**
- **task/dispatch 一律寫「從切版重寫這個元件」，不列「刪 A、加 B」的 patch 清單。**
- 唯一從現況保留的是切版沒有、屬 **React 應用層**的邏輯（權限過濾 `/me`、fetch、路由、Next 慣例）。
- 為什麼：patch 只動被點名的幾處，其餘走樣（舊 token `--color-primary-*`、舊斷點 992、缺 wrapper
  `.header-right`、裸色 `#fff`、缺 aria）**原封繼承**；而且視覺指紋不一定抓得到——Header 桌機
  header-controls 浮空就是 patch 漏網，被 fpdiff `--component` 把絕對位置 normalize 掉沒驗到。

舊 jQuery 真 app **完全不看**。唯一真相是切版。

## ① scss（整份照抄，byte-identical）

- 逐字照抄 `_<name>.scss`。唯二允許差異：①`@use` 路徑深度（依 React 元件實際目錄層級：
  `components/名/` 兩層 `../../styles/`、`components/ui/名/` 三層 `../../../styles/`）②`url(../images/…)`→`url(/images/…)`。
- **連切版註解一起照抄**——那是切版從真 app 複製的原始註解，不是 React 加的；自己加說明註解會讓
  `scss-diff` 全行位移、誤判失敗。
- 零裸 hex、零裸色，全走 `_var.scss` 語意 token。**token 有角色，用錯角色即使數值接近也是 bug**
  （填充 `--brand` ↔ 文字 `--brand-text` 深色下值刻意不同；遮罩墨色只能來自文字族）。
- **逃生口隨 scss 照抄、原封不動**——捲軸 `scrollbar()`、偽元素箭頭、`icon-mask()` 單色圖示、
  `@starting-style` modal、漸層 `border-image`、`writing-mode`：這些在 Tailwind 路徑要拆成
  plugin/utility，但 React+SCSS 路徑**scss byte-identical 就自動帶過去**，不必特別處理。
- 全域層一次照抄：`src/scss/{_var,_base,_mixin,_utilities,_normalize,_form-check,_dark-icons,_size}`
  → `styles/`。`main.scss` 只放全域層 `@use`（`var/normalize/base/utilities/form-check/dark-icons`）；
  元件 scss 由各自 tsx `import "./X.scss"`。
- 驗證：`node scripts/scss-diff.mjs S/…/_X.scss W/…/X.scss` → **exit 0**。

## ② markup（html → tsx，完整結構對照重寫）

機械映射：
- `class`→`className`、`for`→`htmlFor`、`{# #}`→`{/* */}`、自閉合。
- `{% include "…/x.html" %}`→`<X/>`；`{% for a in xs %}`→`{xs.map(a=>…)}`；`{% if c %}`→`{c && …}`/三元；
  `{% set %}`（頁面傳參）→ props。
- **完整結構對照切版**——含 wrapper（`.header-right`）、`aria-*`、`title`。不是「補現況缺的幾處」，
  是照切版把整個 markup 重寫出來。
- 元件命名：切版 kebab（`mobile-nav`）→ React PascalCase 資料夾＋同名 tsx/scss；
  `ui/` 原子→`components/ui/`，大元件→`components/`。
- 切版 template 若有無意縮排 whitespace（渲染出多餘空白文字節點）→ **改切版消除 artifact**，
  不是在 React 塞死節點去湊像素。

## ③ i18n（react-i18next；切版 runtime swap 不帶）

- `data-i18n="k">繁中<`→`{t("k")}`；`data-i18n-title="k" title="繁中"`→`title={t("k")}`
  （`data-i18n-placeholder/aria-label/alt` 同理，對到對應屬性）。
- 切版 `lang-toggle.js` 的 runtime DOM-swap **整支不轉**（它在檔頭自己聲明「轉 React 不帶」）——
  react-i18next 負責。**不要**在 React markup 掛 `data-i18n`/`.js-lang-toggle`。
- 語言鈕：`i18n.changeLanguage` + 標籤永遠顯示「要切去的語言」（en→「中」、zh→「EN」，不進字典）。
- 初始 `lng` 一律 SSR `"zh"`；client mount 後才依 `localStorage("lang")` `changeLanguage`（否則 hydration mismatch）。
- 深淺主題同理：no-flash inline script 在 `<head>` 設 `data-theme`（照抄 `base.html` 的 IIFE），
  `<html suppressHydrationWarning>`（只加在 `<html>`）。圖示切換靠 scss `display: var(--theme-icon-light/dark)`，
  元件不讀 `[data-theme]`。

## ④ 行為（vanilla js → hooks，機械轉寫）

- vanilla 事件 → `useState` + `onClick/onChange`。
- **宣告式屬性 `data-open-modal`/`data-toast`/`data-print` → `onClick`**（屬性移除、不自創新 hook class、
  不保留 document-level 委派）。
- `GufoSlide`→`useSlideToggle`；`showToast`→`useToast()`；`openModal`→受控 `<Modal>`；`aria-expanded`→綁 state。
- 純 CSS 捲動鎖：開關掛 `data-scroll-lock`，`html:has([data-scroll-lock].active)`（不寫 js，`_base.scss` 已有）。
- 切版**業務 hook class**（`.watchBtn`/`.copyBtn`/`.js-apply-production`…）→ **保留**（是轉換契約，不是死碼）。
- **業務邏輯不轉**（抓資料/SSE/圖表資料/表單驗證/日期選擇）——那是 React 應用層。

## ⑤ 平台原生機制一律保留（不准改寫成 div+state）

- `<dialog>`（`showModal()`/`close()`）、`popover`、`:has()`、`@starting-style`/`allow-discrete`、`mask`、`dvh`。
  切版刻意用原生能力，React 端保留，別退化成 div + JS 動畫/手動 body lock。
- runtime 鉤子 class `.js-*`：零 scss 選擇器、零視覺語意，React **不帶**；`fpdiff.mjs` 的 element identity
  排除 `.js-*`（否則「React 正確省略鉤子」被誤判成元素增減）。

## ⑥ 視覺指紋驗收（規則寫成測試，附負控）

- **scss-diff.mjs**：去路徑映射後與切版 byte-identical。
- **fpdiff.mjs**：
  - 幾何（x/y/w/h/display/元素增減）**零容忍、無白名單**。
  - 繪製差異白名單只綁：資產路徑正規化、i18n 文字內容。
  - `--component` 元件模式：normalize 掉元件在頁面的絕對位置，只比內部相對幾何（文件流元件必用）。
  - `--legacy-eval`/`--react-eval` open-state：截圖前 pre-eval 把預設隱藏的元件（modal/drawer）切開再比。
  - element identity 排除 `.js-*`；both-empty / loadFail 硬守門（避免假綠）。
- **full-width 元件**：gallery 展示槽的寬度環境要 = 切版展示頁的**同一條 CSS 算式**（`component.html`
  的 `.full-container`：aside 200px + main `calc(100%-200px)` + padding 1rem + border-box），否則元件內部
  逐像素對、外框 width 仍差——fpdiff `--component` 對「元件在頁面哪裡」是盲的。
- 每條新規則附**負控 + 空轉守門**；能白名單就別黑名單。**假綠測試比沒測試更糟。**

---

## Gotchas（agent 最常轉錯——轉之前先讀一遍）

1. **重寫不 patch（頭號律）**：讀到現況元件別想「改幾處」，一律從切版整份重寫。現況的舊 token / 舊斷點
   / 缺 wrapper / 缺 aria 都是走樣，patch 會繼承、視覺指紋還不一定抓得到。
2. **scss 逐字照抄、含註解**：唯二差異 `@use` 路徑 + 資產路徑；自己加註解會讓 diff 位移。
3. **markup 完整對照、不只補缺**：wrapper（`.header-right`）、aria、title 一個不漏，照切版整份寫。
4. **`.js-*` / `data-i18n` 是切版 runtime 鉤子，不帶**：React 用 react-i18next；fpdiff identity 排除 `.js-*`。
5. **平台原生機制保留**：`<dialog>`/`popover`/`:has()`/`@starting-style`/`mask`/`dvh` 不改寫成 div+state。
6. **宣告式屬性換 onClick**：`data-open-modal`/`data-toast`/`data-print` 移除、換 handler；不保留屬性、
   不保留 document 委派、不自創 hook class。
7. **業務 hook class 保留、業務邏輯不轉**：`.watchBtn` 等是轉換契約；抓資料/SSE/圖表/驗證是應用層。
8. **full-width 元件 fpdiff 要相同寬度環境**：gallery 槽複製切版展示頁的 CSS 算式，否則外框 width 差。
9. **useSlideToggle 子選單拆子元件**：hook 不能在 `.map()` 裡呼叫；收合整個選單用 `setImmediate`（零動畫）。
10. **hydration**：no-flash `<html suppressHydrationWarning>`、i18n init SSR 一律 zh、client mount 才 changeLanguage。

## 元件級眉角（提煉自黃金範例）

- **Modal**：受控 `<dialog>`（effect 依 `open` 呼 `showModal()`/`close()`），刪 `@keyframes`/`.show`/
  `setTimeout`/手動 body lock/裸 rgba；介面對齊現有 consumer。
- **Breadcrumb**：切版 template 縮排 whitespace 是 artifact → 改切版消除（見 ②）。
- **useSlideToggle**：`(open)→{ref,setImmediate}`；mount 首次不 auto-animate（`firstRunRef`）；
  StrictMode 用空 deps cleanup 重置 `firstRunRef`。子選單 slide 因 hook 不能在 `.map()` → 拆子元件；
  收合整個選單時子選單用 `setImmediate`（零動畫，對照 `closeAllSubmenus`）。
- **Header / MobileNav**：full-width；Header 要 `.header-right` wrapper 把 nav+controls+漢堡靠右 group；
  `nav-collapsed`（1250px）窄視窗把 `.header-controls-slot` 收起（controls 改由 mobile-nav 放）。

## 驗收

逐元件對 `dist/component.html`（元件總覽頁）用 `fpdiff.mjs` 比幾何+繪製；scss 對 `_<name>.scss` 用
`scss-diff.mjs` 比 byte-identical。確認每個元件：tsx 從切版**重寫**（非 patch）、scss **byte-identical**、
平台原生機制保留、i18n 走 react-i18next、`.js-*`/`data-i18n` 未帶過去。
