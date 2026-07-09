# SCSS 切版 → React + Tailwind 轉換配方（給轉換 agent）

**目的**：把本專案（11ty + SCSS 切版）轉成 React + Tailwind，**零手寫 CSS**——逃生口（捲軸、markdown 內容、偽元素）用官方/社群 plugin 或 renderer 設定吃掉，不留任何 `.css`/`.scss`。

**你（agent）的產出契約**：
- 每個 `src/_includes/{ui,components}/<name>/` → 一個 `<Name>.tsx`，外觀用 Tailwind utility（含 arbitrary value），**不產生元件旁的 .scss/.css**。
- 樣式的**值以實際 SCSS 檔為準**（本文件給的是「翻譯規則與 theme 設定」，不是值的清單）。SCSS 已對齊真 app 編譯 css，是正確來源。
- 對照 `dist/`（本專案 build 後每頁的最終外觀）逐頁驗收。

轉換順序：**① 建 theme → ② 設斷點 → ③ 裝 plugin → ④ 轉 utility 層與元件 → ⑤ 逃生口用 plugin/renderer → ⑥ 對 dist 驗收**。

---

## ① Theme：把 `src/scss/_var.scss` 色盤 + 間距尺標搬進 Tailwind

### 顏色 token（照搬 `_var.scss`，維持單一色源）

`_var.scss` 是**單層語意 token**：直接給值、沒有 `--color-*` 原色層、沒有別名。淺色定義在 `:root`，深色在 `[data-theme="dark"]` **覆寫同一組名字**。

> **值一律以 `_var.scss` 為準，逐字照搬——不要在本文件維護一份色值清單（會過期）。**

Tailwind v4：把同一組名字加上 `--color-` 前綴放進 `@theme`，深色照樣覆寫同一批變數：

```css
@theme {
  --color-surface: …;  --color-surface-raised: …;  --color-text: …;  --color-text-muted: …;
  --color-brand: …;    --color-brand-text: …;      --color-danger: …; --color-danger-text: …;
  /* …其餘 token 同名照搬（--on-accent、--border、--shadow、--tooltip-bg…） */
}
[data-theme="dark"] {
  --color-surface: …;  --color-brand: …;  --color-brand-text: …;  /* …只覆寫值，名字不變 */
}
```
（v3 則搬進 `tailwind.config` 的 `theme.extend.colors`，key 去掉 `--color-` 前綴。）

**深色模式不需要 `dark:` 變體。** 因為 token 是 CSS 變數、由 `[data-theme]` 覆寫，`bg-surface` / `text-text` 這些 utility 會自動換膚。**別把顏色寫成 `dark:bg-[#0f0f0f]` 這種硬值**——那會把單一色源打散。主題旗標掛 `<html data-theme>`，由 `base.html` 的 no-flash 內聯腳本初始化。

三條不可違背的規則（同 GUIDELINE §4）：

1. **填充與文字的 token 分家**：`bg-brand` / `border-brand`，但文字用 `text-brand-text`（`--brand`／`--brand-text` 在深色模式的值刻意不同——填充要深、文字要亮）。`--danger` / `--danger-text` 同理。
2. **對比度**：白字（`--on-accent`）配任何有色填充 ≥ 4.5:1、填充對底色 ≥ 3:1。唯一例外是 `--warning` 黃底配 `--on-warning` 深字。
3. **`color-scheme`**：`:root { color-scheme: light }` 與 `[data-theme="dark"] { color-scheme: dark }` 必須保留，否則原生 `<select>` 下拉、date picker、autofill、捲軸角落在深色下仍是白的。

漸層 `--brand-gradient`（header 底線、footer 背景）不是顏色 token：設成一般 CSS 變數或用 `bg-[linear-gradient(...)]`。

### 全域基底：Tailwind preflight 沒給的三條，必須自己帶過去

preflight 已含 `box-sizing: border-box` 與 `img{max-width:100%}`，但下面三條**沒有**。它們在 `_base.scss`，是全站可及性/體感的地基，轉換時逐條搬進全域樣式層（v4 用 `@layer base`）：

```css
@layer base {
  :root { color-scheme: light }
  [data-theme="dark"] { color-scheme: dark }          /* 原生 select/date picker/autofill/捲軸角落 */

  :where(a,button,input,select,textarea,summary,[tabindex]):focus-visible {
    outline: 2px solid var(--color-brand-text); outline-offset: 2px;   /* 元件不得裸寫 outline:none */
  }

  @media (prefers-reduced-motion: reduce) {
    *,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; scroll-behavior:auto!important }
  }
}
```

另：所有 `100vh` 都寫成 `height:100vh; height:100dvh`（Tailwind 的 `h-screen` 是 `100vh`，要用 `h-dvh` 或 arbitrary）。

### 間距：px 命名 ÷ 4 = Tailwind 單位（完美整除，通常不需自訂 scale）

`_utilities.scss` 的 `$spacing-scale` 是 px 命名，Tailwind 單位 = px ÷ 4：

| 專案(px) | 2 | 4 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 |
|---|---|---|---|---|---|---|---|---|---|---|
| Tailwind | 0.5 | 1 | 2 | 2.5 | 3 | 4 | 5 | 6 | 8 | 10 |

`gap-16`→`gap-4`、`mt-24`→`mt-6`、`gap-10`→`gap-2.5`。Tailwind 預設 spacing 已涵蓋，不用改 scale。

### 圓角 / 字級

- 圓角（**Tailwind v4 半徑階已改名**，本專案 §1 推 v4）：4px → v4 `rounded-sm`（v3 `rounded`）、8px → `rounded-lg`、2px → v4 `rounded-xs`（v3 `rounded-sm`）、圓形/膠囊 `50%`/`100px`/`1000px`（radio/switch handle/storage-bar/switch 軌道）→ `rounded-full`、30px（date 膠囊）→ `rounded-full`、尺標外 `3px`（`_chatroom.scss` code）→ `rounded-[3px]`。（字級 `text-*` v4 未改名，不受影響。）
- 字級（**注意命名偏移 +1，別同名對應**）：`text-md`(18px)→`text-lg`、`text-lg`(20px)→`text-xl`、`text-xl`(24px)→`text-2xl`；base 16px→`text-base`。
- 字型：`--fontFamily` 設進 theme 的 `--font-sans` 或 config `fontFamily.sans`。

> **顏色一律走 `_var` token（`@theme` 對應），不寫 arbitrary `bg-[#hex]`（`#fff` → `bg-white`）。**

---

## ② 斷點：本專案是 **max-width / mobile-last**，Tailwind 預設是 min-width / mobile-first——**必須自訂，不可直接用 `sm:/md:`**

**系統性斷點**（跨 col/utilities，設成 named screens）：`992px`（`.col-*-sm`、`.mobile-column`、`sm-gap-*`）與 `768px`（`.col-*-xs`、`.mobile-column-xs`、`xs-gap-*`）。

```js
// tailwind.config（v3）— v4 用 @custom-variant/@media 對應
screens: {
  'max-lg': { max: '992px' },  // ≤992
  'max-md': { max: '768px' },  // ≤768
}
```
對應：`mobile-column`（≤992 轉直排）→ `flex-row max-lg:flex-col`；`col-6-md col-12-sm`→ `w-1/2 max-lg:w-full`（或見 §6 gotcha 改 Grid）。

**⚠️ 但 code 裡還有一批「元件專屬」的一次性斷點，只設 992/768 的 agent 會在這些寬度做錯版面——轉各該元件時用 `max-[Npx]` arbitrary variant 處理：**
- `1560px`（+ 降到 `1200px`）：`.wrap` 內容容器最大寬（`_base.scss`，每頁都用）、`countdown-box`。
- `1040px`：`step-nodes`（步驟條）、`catalog`（目錄頁）。
- `991px`/`767px`：`.message-content` 訊息氣泡最大寬（`_chat-message.scss`，共用泡泡）。
- `900px`/`576px`/`560px`/`531px`/`480px`：個別元件（countdown-box、modals 等）。
> 做法：轉某元件時，**讀它自己的 `@media` 值**，逐一對成 `max-[992px]:`/`max-[1560px]:`… 別只靠 named screens。

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
- **host hover 顯示子元素**（tooltip：`.has-tooltip:hover .tooltip{opacity:1}`）→ host 掛 `group`、子元素 `opacity-0 group-hover:opacity-100`。`.has-tooltip` 是 tooltip 自有的觸發 class（掛在放 tooltip 的按鈕上），不是裸 `button:hover`、也不指名別元件 class。
- **目標：轉出的 React 零行內 `style`。** 切版 §4 那三種「合法行內」各自這樣轉（別照抄成 `style`）：
  - `<col style="width:180px">` 欄寬 → arbitrary-value **class** `w-[180px]`（`min-width` → `min-w-[180px]`）。**不是行內。**
  - JS 切換的 `display`（初始 `display:none`）→ conditional **className**（`hidden` / `block`），由 state 決定，不用 `style={{display}}`。
  - **資料驅動的執行期尺寸**（storage-bar `width: 84.3%` 來自真實資料）→ **唯一留在行內的** `style={{width}}`。原因：Tailwind JIT 只掃 build 時的字面 class，掃不到 runtime 才算出的值，動態尺寸沒有對應的 build-time class（連 `w-[${pct}%]` 這種動態拼字串也掃不到）。這是把「資料」餵進 DOM，不是設計樣式，屬不可消除的例外。

---

## ⑤ 逃生口 → 零 CSS 處理（**這裡最容易轉錯，逐項照做**）

### 5-1. 捲軸（`src/scss/_mixin.scss` 的 `scrollbar()/scrollbar_thin()/scrollbar_modal()`）
用 `tailwind-scrollbar` plugin。用到的地方：**9 個元件**（form-control、chatroom、faq-chatroom、multi-select、tab、default-table、form-table、modals、mobile-nav）+ **整頁 html**（`_base.scss`）+ 元件庫頁（`_guideline.scss`）。多數用 `scrollbar_thin`/`scrollbar_modal`（thumb = `--scrollbar-thumb`；`faq-chatroom` 的 `.faq-chat-scroll` 亦此類）→ 掛：
```
scrollbar-thin scrollbar-thumb-scrollbar-thumb scrollbar-track-transparent
```
**例外：整頁 `html` 與 `mobile-nav` 用的是完整 `scrollbar()`，thumb = `--scrollbar-thumb-strong`**（別跟其他一樣上 `--scrollbar-thumb`）。thumb 顏色一律照該處 `@include` 的是哪個 mixin 決定。**不要略過捲軸樣式。**

### 5-2. markdown 產生的富文字（`.robot-msg`，住在共用 `src/_includes/components/chat-message/_chat-message.scss`）
> **`.robot-msg` 由 `chatroom`（後台卡片）與 `faq-chatroom`（前台全高）兩個容器共用**：markdown renderer 的 `components` 對應放在**共用的 `ChatMessage` 元件**，別在兩個容器各複製一份。

`.robot-msg` 對 `h1~h6/p/ul/ol/li/code/pre/blockquote/table/th/td/hr/a` 逐標籤上樣式，而**標題/清單/表格/程式碼那幾層在原始碼裡沒有實體標籤**（demo 是字面 `###`/`-` 文字，正式環境由 markdown renderer 產生）。兩種零 CSS 做法，擇一：

> 注意：`.prompt-content`（`_prompt-card.scss`，只有 `line-height:1.625` + `p{margin:0}`）與 `.collapse-body`（`_collapse-text.scss`，只有 line-clamp + line-height）**不是** markdown 容器，別當 renderer 處理——直接用 `leading-[1.625]`/`line-clamp-3` 等 utility 即可。
- **（建議）react-markdown 的 `components` 對應**：每個 tag 對到帶 Tailwind class 的 component，class 值照 `_chat-message.scss .robot-msg` 內對應標籤的宣告翻譯（如 `h3` 是 `1.25rem`→`text-xl`、`font-weight:600`→`font-semibold`、`line-height:1.3`→`leading-tight`）。**顏色一律照該處實際掛的語意 token**（`--border-subtle`、`--brand`、`--overlay-tint`…），不要改成 Tailwind 內建色階。真正做到「每元素一 utility」。
- **或 `prose`（typography plugin）**：`<div className="prose ...">`，再用 `prose-h3:text-xl prose-th:border-border-subtle`… 等 modifier 校成 `_chat-message.scss` 的值。較快但要逐項校對，否則長相會跟 dist 不同。

### 5-3. 偽元素（`::before`/`::after`）——**清單要完整，別只處理明顯的幾個**
純文字內容的可乾淨轉（`before:/after:` + `content`）：
- 麵包屑分隔 `li+li::before{content:"/"}`（`_breadcrumb.scss`）→ 渲染成真元素，或 `after:content-['/'] after:px-2 after:text-gray-600`。
- 必填星號 `.control-label.required::after{content:"*"}`（`_form-control.scss`）→ `after:content-['*'] after:text-danger`。

貼背景圖的偽元素（`content:'' + url()`）→ `after:content-[''] after:w-5 after:h-5 after:bg-contain after:bg-no-repeat after:bg-[url(...)]`，**或改內嵌 SVG component（建議）**。code 裡實際有的（別漏）：
- 下拉箭頭：`.dropdown::after`（`_header.scss`）、`.select-wrap::after`（`_form-control.scss`，模擬 select）、`.multi-select-control::after`（`_multi-select.scss`）。
- 收合/切換箭頭：`.collapse-toggle::after`（`_collapse-text.scss`）、`.qa-side-panel-toggle::after`（`_qa-side-panel.scss`）。
- 純樣式偽元素（非圖）：header `a.logout::before` 分隔線、`li::after` hover 命中區（`_header.scss`）、multi-select tag 的 `×`（`_multi-select.scss`）→ 用 `before:/after:` + 尺寸/背景。

### 5-4. 自訂 checkbox / radio / switch（`_checkbox.scss`、`_radio.scss`、`_switch.scss`）——**零 CSS 的最弱點，特別注意**
用 `appearance:none`（或隱藏 `opacity:0` 的 input）+ 偽元素/相鄰兄弟畫出控制項（checkbox 用旋轉 border 打勾、radio 用 scale 圓點，**switch 用隱藏 checkbox + `:checked + .switch-box .switch-btn` 相鄰兄弟 + custom property `calc()` 推 handle 位置**，含 `:checked`/`:disabled` 過渡）。純 Tailwind arbitrary `before:` 很難忠實重現。**建議做法：改成受控的 React 元件（SVG icon / 自畫 handle），或此處留一小段 CSS 逃生口**。這是整個轉換裡唯一「硬要零 CSS 會很痛」的地方——若團隊零 CSS 是硬底線，優先走受控元件。

### 5-5. 實體元素的背景圖 icon（不是偽元素，數量多）
`.form-control.search`/`.time`（放大鏡/時鐘，`_form-control.scss`）、`.button-icon` 系列 sprite（`_button.scss`）、`.multiSelect` 相關 icon（`_multi-select.scss`）、`faq-chatroom` 頭像 `icon_owl.png`、`chatbot-header` 的 `Logo.png`、`faq-feedback-modal` 的 `icon_good.png`/`icon_not_good.png`（可切換的 `.feedback-vote-btn` 圖，不是靜態 icon）都是**實體元素**的 `background-image:url(...)`。→ `bg-[url(...)] bg-no-repeat bg-contain` arbitrary，或改 SVG 元件；兩值 `background-size` → `bg-[length:24px_24px]`。**要重寫資產路徑到 React public/，數量大，別漏。**
- **logo 圖片替換文字技法**：`.chatbot-header .logo a`（也見 `_header.scss`）用 `text-indent:101%; white-space:nowrap; overflow:hidden` 把文字推出視野、只留 bg 圖 → `indent-[101%] whitespace-nowrap overflow-hidden`（或直接把文字改 `sr-only`）。`text-indent` 無 utility，用 arbitrary。

### 5-6. 特殊 CSS 屬性
`writing-mode: vertical-rl`（`_qa-side-panel.scss` 側欄直書標題）→ Tailwind 無對應 utility，用 arbitrary property `[writing-mode:vertical-rl]`。

### 5-7. 漸層（**背景 vs 邊框是兩種不同的配方，別混用**）
`--brand-gradient` → theme 存成一般 CSS 變數（不是顏色 token）。兩種用法：
- **背景漸層**（`footer` 背景、`faq-chatroom .avatar`）→ `bg-[image:var(--brand-gradient)]`。
- **漸層邊框**（`chatbot-header`/`header` 的 2px 底線用 `border-bottom:2px solid; border-image:var(--brand-gradient) 1`）→ **不能用 `bg-`**（背景會填滿整塊，不是 2px 底線）。`border-image` 無 utility，用 arbitrary property：`border-b-2 border-solid [border-image:var(--brand-gradient)_1]`。

### 5-8. 前台聊天頁的滿版版型（flex 直欄，別用絕對定位或高度魔術數字）
`chatbot-shell` 是 **flex 直欄**：`.chatbot-wrap` 為 `h-screen`（實作用 `height:100vh; height:100dvh` 兩行，行動瀏覽器扣掉網址列），`chatbot-header` 與 `footer` 各自 `flex-shrink-0` 流在頂/底，中間 `.chatbot-main` 是 `flex-1 min-h-0 overflow-hidden`。
- **`min-h-0` 不可省**：flex child 預設 `min-height:auto`，會被內容撐破而讓內部的 `.faq-chat-scroll` 捲不動。
- 前台頁尾**直接沿用主站 `components/footer`**（沒有 `chatbot-footer` 這個元件）。
- `body.chatbot-page { overflow: hidden }` 只限這頁，別寫成全域。

### 5-9. CSS 動畫（`@keyframes`）——**Tailwind 純 utility 表達不了具名 keyframe**
`ui/modals` 的 `.modals` 開關用 `@keyframes modalFadeInDown/modalFadeOutUp` + `animation: … 0.3s`（`.show`/`.hide` 觸發；所有 modal 含 `faq-*-modal` 共用）。純 utility 無法表達具名 keyframe → 在 v4 `@theme`/`@keyframes` 註冊，或裝 `tailwindcss-animate` plugin；否則開關淡入淡出會被默默丟掉。另 `.modals::backdrop` 初始 `transparent`、`.show` 時變 `var(--overlay)`（帶 transition）→ 用原生 `backdrop:` variant：`backdrop:bg-transparent` + `.show` 時 `backdrop:bg-overlay`。

---

## ⑥ Gotchas（agent 最常轉錯的點——轉之前先讀一遍）

1. **斷點方向相反、且不只 992/768**：專案 `max-width` mobile-last，別套 Tailwind 預設 `md:`（語意顛倒）。系統性用 `max-lg/max-md`，但元件另有 1560/1200/1040/991/900/576… 一次性斷點（§2）——轉某元件時**讀它自己的 `@media` 值**逐一對成 `max-[Npx]:`。
2. **字級命名偏移 +1**：`text-md/lg/xl` → `text-lg/xl/2xl`。別同名。
3. **`text-bold` 是 500 不是 700** → `font-medium`，不是 `font-bold`。
4. **間距是 px 命名**：Tailwind 值 = 名稱 ÷ 4（`gap-16`→`gap-4`）。別直接抄數字。
5. **`.col-N-*` 是 flex + calc 扣 gap**：轉時建議改 **CSS Grid**（`grid grid-cols-12` + `col-span-N`）——Grid 的 gap 不吃欄寬，比原作法乾淨且正確。別照抄 calc。
6. **變體已經是 class，不是後代選擇器**：讀到 `.button-primary`/`.tab.on-record`/`.divider-vertical.sm` 就對成 prop，別回去找 `.qa-record .tab` 那種（那些已被移除）。
7. **尺標外的值用 arbitrary**：`.5625rem`→`py-[9px]`、`108px`→`w-[108px]`、`84.3%`→資料驅動 `style`。別硬湊最近的尺標值改變外觀。
8. **逃生口別略過也別硬 utility**：捲軸走 plugin（§5-1）、markdown 走 react-markdown components（§5-2）、偽元素走 before/after 或 SVG（§5-3）。不要因為「掛不上 class」就漏掉樣式。
9. **狀態/互動是規格**：`.active/.open/.collapsed` 等狀態 → React state；元件的 `<name>.js`（如 `qa-side-panel.js`/`prompt-edit.js`/`accordion.js`）是行為規格，翻成 `useState`/事件，別照搬 DOM 操作。
10. **自訂 checkbox/radio 別硬 utility**（§5-4）：`appearance:none`+偽元素畫的控制項，零 CSS 就走 SVG 元件；硬用 arbitrary `before:` 會重現不出旋轉打勾。這是零 CSS 唯一真的痛點。
11. **實體元素的背景圖 icon 數量多別漏**（§5-5）：搜尋/時間框、`.button-icon` 約 13 個 sprite → `bg-[url()]` 或 SVG，且要改資產路徑。
12. **顏色不全在 token**（§1 附註）：一批 token 外硬寫色需 arbitrary color，別假設都有 token。
13. **值以 SCSS + dist 為準**：本文件是規則；遇到衝突，以實際 `_<name>.scss` 的宣告與 `dist/<page>.html` 的最終外觀為準（兩者已對齊真 app）。
14. **高 z-index 超出 Tailwind 預設**：Tailwind 只出 `z-0..z-50`，但 code 有 toast `2000`、header `1000`、`feature-disabled-overlay`/`chatbot-header` `100`/`99`、`mobile-nav` `97~100`、`qa-side-panel` `10/2/1` → 一律 `z-[N]` arbitrary，別夾成 `z-50` 破壞疊層。
15. **版面值裡的 `max()/min()/calc()`**：如 `qa-side-panel` 的 `top: max(72px, 100vh - 550px)` → arbitrary 並把算式包進 `calc()`：`top-[max(72px,calc(100vh-550px))]`（底線代空白、留意巢狀）。
16. **相鄰兄弟選擇器機械轉抓不到**：`success-box p+p`、`header li+li`、`radio &+span`、`form-table &+.form-table-group`、`switch :checked+.switch-box` 這類 `+`/`~` 選擇器，class→className 會漏 → 用 `[&+p]:…` 等 arbitrary variant，或改結構。

---

## 驗收

逐頁對 `dist/`（本專案 build 後輸出）比對外觀與 RWD（在 992/768 斷點檢查折行）；元件對 `component.html`（元件總覽頁）比對。確認 repo 內**無任何 `.css`/`.scss`**、逃生口都由 plugin/react-markdown/before-after 承接。
