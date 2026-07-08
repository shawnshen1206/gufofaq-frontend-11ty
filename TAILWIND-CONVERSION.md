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
  --color-blockquote-bg: rgba(0, 0, 0, 0.02); /* markdown 引言區塊背景（半透明黑） */
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

- 圓角（**Tailwind v4 半徑階已改名**，本專案 §1 推 v4）：4px → v4 `rounded-sm`（v3 `rounded`）、8px → `rounded-lg`、2px → v4 `rounded-xs`（v3 `rounded-sm`）、圓形/膠囊 `50%`/`100px`/`1000px`（radio/switch handle/storage-bar/switch 軌道）→ `rounded-full`、30px（date 膠囊）→ `rounded-full`、尺標外 `3px`（`_chatroom.scss` code）→ `rounded-[3px]`。（字級 `text-*` v4 未改名，不受影響。）
- 字級（**注意命名偏移 +1，別同名對應**）：`text-md`(18px)→`text-lg`、`text-lg`(20px)→`text-xl`、`text-xl`(24px)→`text-2xl`；base 16px→`text-base`。
- 字型：`--fontFamily` 設進 theme 的 `--font-sans` 或 config `fontFamily.sans`。

> **顏色不是全在 token**：多數顏色走 `_var.scss`，但既有 verbatim atom 仍有一批**未 token 化的原色**需 arbitrary color（`bg-[#fe790d]` 等）：`_button.scss` 的 `#fe790d`/`#267594`（orange/dark variant）、`_switch.scss` 的 `#409144`/`rgb(108,108,108)`、`_storage-bar.scss` 的 `#b4bfc9`、`_base.scss` 的 `#fafafa`、chatroom/tab 的 `#4e4e4e`/`#efefef` 等。別假設每個顏色都有 token。（這批屬 GUIDELINE §4 待補債，日後會逐一收成 `_var` token；`rgba(0,0,0,.02)` 已收成 `--color-blockquote-bg`，走一般 token 對應。）

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

---

## ⑤ 逃生口 → 零 CSS 處理（**這裡最容易轉錯，逐項照做**）

### 5-1. 捲軸（`src/scss/_mixin.scss` 的 `scrollbar()/scrollbar_thin()/scrollbar_modal()`）
用 `tailwind-scrollbar` plugin。用到的地方：**9 個元件**（form-control、chatroom、faq-chatroom、multi-select、tab、default-table、form-table、modals、mobile-nav）+ **整頁 html**（`_base.scss`）+ 元件庫頁（`_guideline.scss`）。多數用 `scrollbar_thin`/`scrollbar_modal`（thumb = `--color-gray-500`；`faq-chatroom` 的 `.faq-chat-scroll` 亦此類）→ 掛：
```
scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent
```
**例外：整頁 `html` 與 `mobile-nav` 用的是完整 `scrollbar()`，thumb = `--color-primary-dark`** → 這兩處掛 `scrollbar-thumb-primary-dark`（別跟其他一樣上 gray-500）。thumb 顏色一律照該處 `@include` 的是哪個 mixin 決定。**不要略過捲軸樣式。**

### 5-2. markdown 產生的富文字（`.robot-msg`，住在共用 `src/_includes/components/chat-message/_chat-message.scss`）
> **`.robot-msg` 已抽成共用**：由 `chatroom`（後台卡片）與 `faq-chatroom`（前台全高）**兩個容器元件共用**。轉換時 markdown renderer 的 `components` 對應要放在**共用的 `ChatMessage` 元件**（後台/前台都 render 它），**不要在兩個 chatroom 各複製一份**。

`.robot-msg` 對 `h1~h6/p/ul/ol/li/code/pre/blockquote/table/th/td/hr/a` 逐標籤上樣式，而**標題/清單/表格/程式碼那幾層在原始碼裡沒有實體標籤**（demo 是字面 `###`/`-` 文字，正式環境由 markdown renderer 產生）。兩種零 CSS 做法，擇一：

> 注意：`.prompt-content`（`_prompt-card.scss`，只有 `line-height:1.625` + `p{margin:0}`）與 `.collapse-body`（`_collapse-text.scss`，只有 line-clamp + line-height）**不是** markdown 容器，別當 renderer 處理——直接用 `leading-[1.625]`/`line-clamp-3` 等 utility 即可。
- **（建議）react-markdown 的 `components` 對應**：每個 tag 對到帶 Tailwind class 的 component，class 值照 `_chat-message.scss .robot-msg` 內對應標籤的宣告翻譯（如 `h3` 是 `1.25rem`→`text-xl`、`font-weight:600`→`font-semibold`、`line-height:1.3`→`leading-tight`；`code` bg `--color-gray-100`、色 `--color-primary-dark`；`table th/td` border `--color-gray-200`；`blockquote` bg `--color-blockquote-bg`…）。真正做到「每元素一 utility」。
- **或 `prose`（typography plugin）**：`<div className="prose ...">`，再用 `prose-h3:text-xl prose-code:text-primary-dark prose-th:border-gray-200`… 等 modifier 校成 `_chatroom.scss` 的值。較快但要逐項校對，否則長相會跟 dist 不同。

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
`.form-control.search`/`.time`（放大鏡/時鐘，`_form-control.scss`）、`.button-icon` 系列約 16 個 sprite（`_button.scss`，含新增的 `like`/`dislike`/`share`）、`.multiSelect` 相關 icon（`_multi-select.scss`）都是**實體元素**的 `background-image:url(../images/*.png)`。→ `bg-[url(...)] bg-no-repeat bg-contain` arbitrary，或改 SVG 元件；**要重寫資產路徑到 React public/，數量大，別漏。**
- **今天新增的 bg-image 資產**：`icon_owl.png`（faq-chatroom 頭像 `.avatar .pic`）、`Logo.png`（chatbot-header logo，見下方 text-indent）、`icon_good.png`/`icon_not_good.png`（**在 faq-feedback-modal 是可切換的 `.feedback-vote-btn.like/.dislike .feedback-vote-icon`，不是靜態 icon**）。`bg-size` 兩值（`24px 24px`）→ `bg-[length:24px_24px]`。
- **logo 圖片替換文字技法**：`.chatbot-header .logo a`（也見 `_header.scss`）用 `text-indent:101%; white-space:nowrap; overflow:hidden` 把文字推出視野、只留 bg 圖 → `indent-[101%] whitespace-nowrap overflow-hidden`（或直接把文字改 `sr-only`）。`text-indent` 無 utility，用 arbitrary。

### 5-6. 特殊 CSS 屬性
`writing-mode: vertical-rl`（`_qa-side-panel.scss` 側欄直書標題）→ Tailwind 無對應 utility，用 arbitrary property `[writing-mode:vertical-rl]`。

### 5-7. 漸層（**背景 vs 邊框是兩種不同的配方，別混用**）
`--color-primary-linear` → theme 存成變數。兩種用法：
- **背景漸層**（footer 背景、`chatbot-footer`、`faq-chatroom .avatar`）→ `bg-[image:var(--color-primary-linear)]` 或 `bg-[linear-gradient(to_right,#0a62ac,#2ebbcf)]`。
- **漸層邊框**（`chatbot-header`/`header` 的 2px 底線用 `border-bottom:2px solid; border-image:var(--color-primary-linear) 1`）→ **不能用 `bg-`**（背景會填滿整塊，不是 2px 底線）。`border-image` 無 utility，用 arbitrary property：`border-b-2 border-solid [border-image:var(--color-primary-linear)_1]`。

### 5-8. 版面用 custom property：shell 定義、子片段消費（別逐檔內聯 px）
`chatbot-shell` 在 `.chatbot-wrap` 定義 `--header-height:72px`/`--footer-height:38px`，由**分屬 4 個 scss 檔**的 `.chatbot-header`（`height`）、`.chatbot-footer`（`height`）、`.chatbot-main`（`top`/`bottom`）消費。這是**跨檔的版面契約**——機械式 class→className 會把每個 `height`/`top`/`bottom` 各自轉、遺失共用變數或把 72/38 內聯到各處不一致。做法：把兩個變數保留成 CSS 變數（定義在 wrap 上，或塞進 `@theme`），子片段用 `top-[var(--header-height)]`/`bottom-[var(--footer-height)]`/`h-[var(--header-height)]`。

### 5-9. CSS 動畫（`@keyframes`）——**Tailwind 純 utility 表達不了具名 keyframe**
`ui/modals` 的 `.modals` 開關用 `@keyframes modalFadeInDown/modalFadeOutUp` + `animation: … 0.3s`（`.show`/`.hide` 觸發）；**今天的 `faq-share-modal`/`faq-feedback-modal` 內容都在 `.modals` 內，共用這組動畫**。純 utility 無法表達具名 keyframe → 在 v4 `@theme`/`@keyframes` 註冊，或裝 `tailwindcss-animate` plugin；否則開關淡入淡出會被默默丟掉。另 `.modals::backdrop{background:rgba(0,0,0,.3)}`（`.show` 時）→ 用原生 `backdrop:` variant：`backdrop:bg-black/30`。

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
16. **相鄰兄弟選擇器機械轉抓不到**：`success-box p+p`、`header li+li`、`radio &+span`、`form-table &+.form-table-group`、`switch :checked+.switch-box` 這類 `+`/`~` 選擇器，class→className 會漏 → 用 `[&+p]:…` 等 arbitrary variant，或改結構。（今天 `chat-message` 已把舊的 `.ab-compare + .message-time` 兄弟覆寫改成 `.message-time.after-compare` 變體 class，是正解示範。）

---

## 驗收

逐頁對 `dist/`（本專案 build 後輸出）比對外觀與 RWD（在 992/768 斷點檢查折行）；元件對 `component.html`（元件總覽頁）比對。確認 repo 內**無任何 `.css`/`.scss`**、逃生口都由 plugin/react-markdown/before-after 承接。
