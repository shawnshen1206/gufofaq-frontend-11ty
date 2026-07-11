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
- 舊 jQuery 真 app 不看。

## ① scss（byte-identical）

- 逐字照抄 `_<name>.scss`，**含切版原有註解**。唯二差異：`@use` 路徑深度、`url(../images/…)`→`url(/images/…)`。
- 顏色走 `_var.scss` 語意 token，零裸 hex／裸色。填充用 `--brand`、文字用 `--brand-text`、遮罩墨色取文字族。
- 逃生口（捲軸、偽元素、`icon-mask`、`@starting-style`、`border-image` 漸層、`writing-mode`）隨 scss 照抄。
- 全域層 `src/scss/{_var,_base,_mixin,_utilities,_normalize,_form-check,_dark-icons,_size}` → `styles/`；
  `main.scss` 只放全域層 `@use`，元件 scss 由各自 tsx `import "./X.scss"`。
- `scss-diff.mjs` exit 0。

## ② markup（html → tsx）

- `class`→`className`、`for`→`htmlFor`、`{# #}`→`{/* */}`、自閉合。
- `{% include "x.html" %}`→`<X/>`、`{% for a in xs %}`→`{xs.map(a=>…)}`、`{% if c %}`→`{c && …}`／三元、`{% set %}`→props。
- markup 完整照切版：wrapper、`aria-*`、`title` 全數帶到。
- 命名：kebab（`mobile-nav`）→ PascalCase 資料夾＋同名 tsx/scss；`ui/` 原子→`components/ui/`，大元件→`components/`。
- 切版 template 產生的縮排空白文字節點：改切版消除，React 不補死節點。

## ③ i18n（react-i18next）

- `data-i18n="k">文<`→`{t("k")}`；`data-i18n-title="k"`→`title={t("k")}`（placeholder/aria-label/alt 對到對應屬性）。
- markup 不掛 `data-i18n`／`.js-lang-toggle`。
- 語言鈕標籤顯示要切去的語言（en→「中」、zh→「EN」，不進字典）；點擊 `i18n.changeLanguage` + `localStorage("lang")`。
- i18n init `lng="zh"`；client mount 後依 `localStorage("lang")` `changeLanguage`。
- 主題：`<head>` no-flash inline script 設 `data-theme`（照抄 `base.html` 的 IIFE）、`<html suppressHydrationWarning>`；
  圖示切換用 scss `display: var(--theme-icon-*)`，元件不讀 `[data-theme]`。

## ④ 行為（vanilla js → hooks）

- vanilla 事件 → `useState` + `onClick/onChange`。
- `data-open-modal`／`data-toast`／`data-print` → `onClick`；移除屬性、不自創 hook class、不留 document 委派。
- `GufoSlide`→`useSlideToggle`、`showToast`→`useToast()`、`openModal`→受控 `<Modal>`、`aria-expanded`→綁 state。
- 捲動鎖：開關掛 `data-scroll-lock`（`html:has([data-scroll-lock].active)` 在 `_base.scss`）。
- 業務 hook class（`.watchBtn`／`.copyBtn`／`.js-apply-production`…）保留。
- 業務邏輯（抓資料／SSE／圖表／表單驗證／日期）不轉。
- `<name>.js` 裡「次要的無障礙同步」也算行為、要一併轉，不是只轉主要互動：例如桌機下拉選單
  本身是純 CSS `:hover`/`:focus-within`，但 `header.js` 另外用 `mouseenter`/`mouseleave`/
  `focusin`/`focusout` 把 `aria-expanded` 同步成「子選單當下是否顯示」（CSS 改不了 ARIA）——
  這種同檔案但容易被 task 描述漏掉的第二支行為，讀 `<name>.js` 全文才會發現，只看 task brief
  列的重點摘要會漏轉。

## ⑤ 平台原生機制保留

- `<dialog>`／`popover`／`:has()`／`@starting-style`／`allow-discrete`／`mask`／`dvh` 保留，不改成 div + state。
- `.js-*` 不帶；`fpdiff.mjs` element identity 排除 `.js-*`。

## ⑥ 視覺指紋驗收

- `scss-diff.mjs`：去路徑映射後 byte-identical。
- `fpdiff.mjs`：幾何（x/y/w/h/display/元素增減）零容忍；繪製白名單只含資產路徑 + i18n 文字；
  `--component` normalize 元件絕對位置；`--legacy-eval`／`--react-eval` 開隱藏元件；排除 `.js-*`；both-empty／loadFail 守門。
- full-width 元件：gallery 展示槽用切版展示頁的同一條寬度算式
  （`.full-container`：aside 200px + main `calc(100% - 200px)` + padding 1rem + border-box）。
- React 應用層資料（例：`/api/me` 權限過濾選單）會讓 React 端顯示內容天生少於永遠無過濾的
  切版 `dist` 頁——這不是視覺 bug，兩側資料前提本來就不對等，不能靠放寬幾何判準解決。用
  `fpdiff.mjs` 的 `--react-route="<urlGlob>|<json>"`／`--legacy-route=`（`page.route()` 在
  `goto` 前攔截、回一致資料）讓兩側資料前提一致後再比幾何；只加能力、不改 (A)-(D) 判準本身。
- WAAPI 動畫（如 `useSlideToggle` 的 300ms slide）open-state 截圖：固定的字型等待時間
  （約 150ms）不夠讓動畫跑完，會截到動畫中途的高度。`--legacy-eval`／`--react-eval` 用 async
  IIFE 觸發後 `await` 一段超過動畫時長的 timeout（例：`(async()=>{el.click();await new
  Promise(r=>setTimeout(r,500));})()`），兩側用同一段腳本、同一個等待時間。
- 新規則附負控 + 空轉守門；能白名單就別黑名單。

---

## 機械對照（元件常見）

- 斷點：切版 max-width mobile-last；`nav-collapsed` 1250px（header ↔ mobile-nav 同值，收在 `_mixin.scss`）。
- Header：`.header-right` 包 desktop-nav + `.header-controls-slot` + nav-toggle；nav-collapsed 時 `.header-controls-slot` 收起。
- MobileNav：`.mobile-menu-wrap` 與各子選單用 `useSlideToggle`；子選單拆子元件（hook 不入 `.map()`）；收合整個選單時子選單用 `setImmediate` 零動畫收合，**同時**把子選單的 `open` state 也設回 `false`（同步 `aria-expanded`，對照 `closeAllSubmenus` 的 `setAttribute("aria-expanded","false")`）——`setImmediate` 只保證「這次不動畫」，state 之後真的變化仍會讓 `useSlideToggle` 的 `[open]` effect 正常再跑一次動畫（這是設計如此，不是 bug）；因為子選單巢狀在同樣正在收合、`overflow:hidden` 收到 0 高度的父層 wrap 內，這次「多餘」動畫不可見，結算狀態仍正確，不需要額外機制去避免它。
- Modal：受控 `<dialog>`，effect 依 `open` 呼 `showModal()`／`close()`。
- useSlideToggle：介面 `(open) → { ref, setImmediate }`；mount 首次不動畫。

## 驗收

逐元件對 `dist/component.html` 用 `fpdiff.mjs` 比幾何 + 繪製；scss 對 `_<name>.scss` 用 `scss-diff.mjs` 比 byte-identical。
確認：tsx 從切版重寫、scss byte-identical、原生機制保留、i18n 走 react-i18next、`.js-*`／`data-i18n` 未帶。

## 測試環境一次性坑

- `apps/web` 的元件慣例用 `@/…` 絕對匯入（同 `tsconfig.json` 的 `paths`）。Next build/dev 原生讀
  tsconfig paths，但 `vitest.config.ts` 底層是 Vite、不會自動套用，要在 `resolve.alias` 明講一次
  同一條映射，否則第一個「transitively import 到用 `@/` 的模組」的測試檔就會
  `Failed to resolve import`（這不是新元件的 bug，是測試設定本身缺一塊，補一次全域生效）。
