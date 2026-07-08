# SCSS 切版 → React + Tailwind 轉換配方（給轉換 agent）

**目的**：把本專案（11ty + SCSS 切版）轉成 React + Tailwind，**零手寫 CSS**——逃生口（捲軸、markdown 內容、偽元素）用官方/社群 plugin 或 renderer 設定吃掉，不留任何 `.css`/`.scss`。

**你（agent）的產出契約**：
- 每個 `src/_includes/{ui,components}/<name>/` → 一個 `<Name>.tsx`，外觀用 Tailwind utility（含 arbitrary value），**不產生元件旁的 .scss/.css**。
- 樣式的**值以實際 SCSS 檔為準**（本文件給的是「翻譯規則與 theme 設定」，不是值的清單）。SCSS 已對齊真 app 編譯 css，是正確來源。
- 對照 `dist/`（本專案 build 後每頁的最終外觀）逐頁驗收。

轉換順序：**① 建 theme → ② 設斷點 → ③ 裝 plugin → ④ 轉 utility 層與元件 → ⑤ 逃生口用 plugin/renderer → ⑥ 對 dist 驗收**。

---

## ① Theme：把 `src/scss/_var.scss` 色盤 + 間距尺標搬進 Tailwind

### 顏色 token（一字對應 `_var.scss`，維持單一色源）

Tailwind v4 `@theme`（建議，直接是 CSS 變數、和現有 `var(--color-*)` 語意一致）：

```css
@theme {
  --color-primary: #168ed1;
  --color-primary-hover: #037ec3;
  --color-primary-light: #e7f7ff;
  --color-primary-dark: #13386f;
  --color-success: #00b526;
  --color-success-hover: #019520;
  --color-info: #0d97e5;
  --color-warning: #ffc700;
  --color-warning-hover: #efbb00;
  --color-danger: #f12929;
  --color-danger-hover: #d41414;
  --color-gray-100: #f9f9f9;
  --color-gray-200: #f5f5f5;
  --color-gray-300: #f1f1f1;
  --color-gray-400: #e1e1e1;
  --color-gray-500: #dfdfdf;
  --color-gray-600: #6c6c6c;
  --color-black: #222222;
}
/* 語意別名：text-default=black、text-dark=gray-600、border-default=gray-400、bg-primary=#e7f7ff */
/* 漸層 --color-primary-linear（header 底線、footer 背景）非顏色 token：設成一般 CSS 變數或用 bg-[linear-gradient(to_right,#0a62ac,#2ebbcf)] */
```
（v3 則搬進 `tailwind.config` 的 `theme.extend.colors`，key 去掉 `--color-` 前綴。）

語意 class 對應：`text-blue`→`text-primary`、`text-red`→`text-danger`、`text-gray`→`text-gray-600`、`text-default`→`text-black`。

### 間距：px 命名 ÷ 4 = Tailwind 單位（完美整除，通常不需自訂 scale）

`_utilities.scss` 的 `$spacing-scale` 是 px 命名，Tailwind 單位 = px ÷ 4：

| 專案(px) | 2 | 4 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 |
|---|---|---|---|---|---|---|---|---|---|---|
| Tailwind | 0.5 | 1 | 2 | 2.5 | 3 | 4 | 5 | 6 | 8 | 10 |

`gap-16`→`gap-4`、`mt-24`→`mt-6`、`gap-10`→`gap-2.5`。Tailwind 預設 spacing 已涵蓋，不用改 scale。

### 圓角 / 字級

- 圓角：4px→`rounded`、8px→`rounded-lg`、2px→`rounded-sm`、30px 膠囊→`rounded-full`。
- 字級（**注意命名偏移，別同名對應**）：`text-md`(18px)→`text-lg`、`text-lg`(20px)→`text-xl`、`text-xl`(24px)→`text-2xl`；base 16px→`text-base`。
- 字型：`--fontFamily` 設進 theme 的 `--font-sans` 或 config `fontFamily.sans`。

---

## ② 斷點：本專案是 **max-width / mobile-last**，Tailwind 預設是 min-width / mobile-first——**必須自訂，不可直接用 `sm:/md:`**

專案斷點：`992px`（`.col-*-sm`、`.mobile-column`、多數元件）與 `768px`（`.col-*-xs`、`.mobile-column-xs`）。另 `.message-content` 用 `991/767`（可併入近似）。

```js
// tailwind.config（v3）— v4 用 @custom-variant/@media 對應
screens: {
  'max-lg': { max: '992px' },  // ≤992：對應 .col-*-sm / .mobile-column / sm-gap-*
  'max-md': { max: '768px' },  // ≤768：對應 .col-*-xs / .mobile-column-xs / xs-gap-*
}
```
對應：`mobile-column`（≤992 轉直排）→ `flex-row max-lg:flex-col`；`col-6-md col-12-sm`→ `w-1/2 max-lg:w-full`（或見 §5 gotcha 改 Grid）。

---

## ③ 裝 plugin（吃逃生口，換取零 CSS）

```
@tailwindcss/typography   → prose，處理 markdown 產生的富文字（見 §5-2）
tailwind-scrollbar        → scrollbar-thin 等，處理自訂捲軸（見 §5-1）
```

---

## ④ utility 層與元件外觀 → Tailwind utility

### 4-1. `_utilities.scss` 工具 class（markup ~180 處，機械對照）

| 專案 | Tailwind | 專案 | Tailwind |
|---|---|---|---|
| `flex-row` | `flex` | `column`/`.flex-row.column` | `flex-col` |
| `gap-16`（尺標） | `gap-4`（÷4） | `align-items-center` | `items-center` |
| `justify-content-between` | `justify-between` | `align-items-start/end` | `items-start/end` |
| `justify-content-center/start/end` | `justify-center/start/end` | `flex-wrap` | `flex-wrap` |
| `mt-24`/`mb-*`/`my-*` | `mt-6`… | `m-0` | `m-0` |
| `text-center/left/right` | 同名 | `hidden` | `hidden` |
| `text-md/lg/xl` | `text-lg/xl/2xl`（偏移！） | `text-bold`（=500） | `font-medium`（**不是 font-bold**） |
| `text-red/blue/gray` | `text-danger/primary/gray-600` | `text-default` | `text-black` |
| `w100` | `w-full` | `flex-1`(`flex:1 1 0;min-width:0`) | `flex-1 min-w-0` |
| `flex-shrink-0` | `shrink-0` | `relative` | `relative` |
| `ellipsis-1` | `truncate` | `ellipsis-2/3` | `line-clamp-2/3` |
| `sr-only` | `sr-only` | `col-N-md`(見 gotcha) | grid `col-span-N` 或 `w-[N/12]` |

`!important`（`.text-center`/`mt-*`/`hidden` 帶）→ Tailwind utility 靠 layer 勝出，通常**不需**加 `!`。

### 4-2. 元件 scss → utility

一元件一 `.tsx`。把 `_<name>.scss` 的規則翻成 utility 串；值以檔案為準，**尺標外的值用 arbitrary**（如 `.button` 的 `padding:.5625rem 1rem` → `px-4 py-[9px]`；`.storage-bar` 的 `width:84.3%` 是資料驅動 → `style={{width}}`）。

- **變體 class → props / CVA**：本專案已把跨元件覆寫改成變體（`.button-primary/-border/-orange/-dark/-red/-green`、`.divider-vertical.sm/.lg`、`.link-modal.on-dark`、`.tab.on-record`、`.message-content.in-compare`、`.list-style-disc.line-loose`、`.block-sm/-lg`、`.form-control.select-sm/-md`、`.size-sm/-lg`…）。**直接把每個變體對成一個 prop/variant，不要回去讀後代選擇器**。
- **狀態 class → conditional className**：`.active/.open/.done/.collapsed/.disabled/.error` → React state/props（`className={clsx('tab', open && 'active-utils')}`）。
- **`:has()` → state**：`.form-group:has(.error) .error-prompt{display:block}`、`td:has(.form-checkbox)` → 用 state/prop 判斷，比 `has-[]` variant 清楚。

---

## ⑤ 逃生口 → 零 CSS 處理（**這裡最容易轉錯，逐項照做**）

### 5-1. 捲軸（`src/scss/_mixin.scss` 的 `scrollbar()/scrollbar_thin()/scrollbar_modal()`，用於 ~10 個元件）
用 `tailwind-scrollbar` plugin。對應該元件原本 `@include scrollbar_thin()` 的元素 → 掛：
```
scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent
```
（`scrollbar()` 整頁版 thumb 是 `--color-primary-dark`；`scrollbar_thin/_modal` 是 `--color-gray-500`。thumb 顏色照 mixin 對應 token。）**不要略過捲軸樣式。**

### 5-2. markdown 產生的富文字（`src/_includes/components/chatroom/_chatroom.scss` 的 `.robot-msg` 後代選擇器；另 `.prompt-content`、`_collapse-text.scss` 的 `.collapse-body`）
這些 `h1~h6/p/ul/ol/li/code/pre/blockquote/table/th/td/hr/a` 是執行期 markdown 產生、**原始碼裡沒有這些標籤**。兩種零 CSS 做法，擇一：
- **（建議）react-markdown 的 `components` 對應**：每個 tag 對到帶 Tailwind class 的 component，class 值照 `_chatroom.scss .robot-msg` 內對應標籤的宣告翻譯（如 `h3` 是 `1.25rem`→`text-xl`、`font-weight:600`→`font-semibold`、`line-height:1.3`→`leading-tight`；`code` bg `--color-gray-100`、色 `--color-primary-dark`；`table th/td` border `--color-gray-200`…）。真正做到「每元素一 utility」。
- **或 `prose`（typography plugin）**：`<div className="prose ...">`，再用 `prose-h3:text-xl prose-code:text-primary-dark prose-th:border-gray-200`… 等 modifier 校成 `_chatroom.scss` 的值。較快但要逐項校對，否則長相會跟 dist 不同。

### 5-3. 偽元素（`::before`/`::after`）
- 麵包屑分隔 `li+li::before{content:"/"}`（`_breadcrumb.scss`）→ 在 React 直接把 `/` 當分隔元素渲染，或 `after:content-['/'] after:px-2 after:text-gray-600`。
- 必填星號 `.control-label.required::after{content:"*"}`（`_form-control.scss`）→ `after:content-['*'] after:text-danger`。
- 貼背景圖的箭頭（下拉 `.dropdown::after`、收合 `.collapse-toggle::after`/`.qa-side-panel-toggle::after` 等，貼 `url(...)`）→ `after:content-[''] after:w-5 after:h-5 after:bg-contain after:bg-no-repeat after:bg-[url(/images/xxx.png)]`（資產路徑改成 React 端 public 路徑）。或改用內嵌 SVG icon component（更乾淨，建議）。

### 5-4. 漸層
`--color-primary-linear`（header 底線 `border-image`、footer 背景）→ theme 存成變數，用 `bg-[image:var(--color-primary-linear)]` 或 arbitrary `bg-[linear-gradient(to_right,#0a62ac,#2ebbcf)]`。

---

## ⑥ Gotchas（agent 最常轉錯的點——轉之前先讀一遍）

1. **斷點方向相反**：專案 `max-width` mobile-last，Tailwind 預設 min-width。**一定要用 §2 的自訂 `max-lg/max-md`**，別套 `md:`（會語意顛倒）。
2. **字級命名偏移 +1**：`text-md/lg/xl` → `text-lg/xl/2xl`。別同名。
3. **`text-bold` 是 500 不是 700** → `font-medium`，不是 `font-bold`。
4. **間距是 px 命名**：Tailwind 值 = 名稱 ÷ 4（`gap-16`→`gap-4`）。別直接抄數字。
5. **`.col-N-*` 是 flex + calc 扣 gap**：轉時建議改 **CSS Grid**（`grid grid-cols-12` + `col-span-N`）——Grid 的 gap 不吃欄寬，比原作法乾淨且正確。別照抄 calc。
6. **變體已經是 class，不是後代選擇器**：讀到 `.button-primary`/`.tab.on-record`/`.divider-vertical.sm` 就對成 prop，別回去找 `.qa-record .tab` 那種（那些已被移除）。
7. **尺標外的值用 arbitrary**：`.5625rem`→`py-[9px]`、`108px`→`w-[108px]`、`84.3%`→資料驅動 `style`。別硬湊最近的尺標值改變外觀。
8. **逃生口別略過也別硬 utility**：捲軸走 plugin（§5-1）、markdown 走 react-markdown components（§5-2）、偽元素走 before/after 或 SVG（§5-3）。不要因為「掛不上 class」就漏掉樣式。
9. **狀態/互動是規格**：`.active/.open/.collapsed` 等狀態 → React state；元件的 `<name>.js`（如 `qa-side-panel.js`/`prompt-edit.js`/`accordion.js`）是行為規格，翻成 `useState`/事件，別照搬 DOM 操作。
10. **值以 SCSS + dist 為準**：本文件是規則；遇到衝突，以實際 `_<name>.scss` 的宣告與 `dist/<page>.html` 的最終外觀為準（兩者已對齊真 app）。

---

## 驗收

逐頁對 `dist/`（本專案 build 後輸出）比對外觀與 RWD（在 992/768 斷點檢查折行）；元件對 `component.html`（元件總覽頁）比對。確認 repo 內**無任何 `.css`/`.scss`**、逃生口都由 plugin/react-markdown/before-after 承接。
