# SCSS → Tailwind 轉換配方（給做 React 前端的 agent）

本專案的 SCSS 是**刻意做成好轉 Tailwind 的**（語意 token、對齊尺標、utility 層、一元件一資料夾）。但**不是純機械 1:1**：約 80% 可機械轉成 utility，剩約 20% 是 utility-first 先天做不到的「逃生口」，必須保留成一份薄 CSS 或用 plugin。

> 前提：GUIDELINE §7 的預設路線是「scss 原樣複製、CSS 免翻譯」。**只有在你（React 團隊）明確選擇 Tailwind 時才走本文件**；走了就等於偏離 §7 的原樣複製契約，請確認這是團隊決定。

轉換順序：**先建 theme（token）→ 設斷點 → 轉 utility 層與元件外觀 → 把逃生口留成 CSS**。

---

## 1. 先建 theme（把 `_var.scss` 與間距尺標映射進 Tailwind）

### 1-1. 間距：px 命名 ÷ 4 = Tailwind 單位（完美整除）

本專案間距尺標（`src/scss/_utilities.scss` 的 `$spacing-scale`）用 **px 命名**，而 Tailwind 單位 = px ÷ 4，全部整除：

| 專案（px） | 2 | 4 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 |
|---|---|---|---|---|---|---|---|---|---|---|
| Tailwind | 0.5 | 1 | 2 | 2.5 | 3 | 4 | 5 | 6 | 8 | 10 |

所以 `gap-16`→`gap-4`、`mt-24`→`mt-6`、`gap-10`→`gap-2.5`、`mb-8`→`mb-2`、`my-40`→`my-10`。Tailwind 預設 spacing scale 已涵蓋這些值，**通常不需自訂**。

### 1-2. 顏色：`_var.scss` 的 `--color-*` → theme token

`src/scss/_var.scss` 是全站唯一色源（30+ 個 CSS 變數）。Tailwind v4 用 `@theme` 幾乎可直接引用；v3 則搬進 `tailwind.config` 的 `theme.colors`。對應範例：

| CSS 變數 | 建議 token | 用途 → utility |
|---|---|---|
| `--color-primary` `#168ed1` | `primary` | `bg-primary` / `text-primary` / `border-primary` |
| `--color-primary-dark` `#13386f` | `primary-dark` | 捲軸 thumb、標題 |
| `--color-success` `#00b526` | `success` | toast success |
| `--color-danger` `#f12929` | `danger` | 錯誤、`text-red`→`text-danger` |
| `--color-warning` `#ffc700` | `warning` | toast warning |
| `--color-info` `#0d97e5` | `info` | toast info |
| `--color-gray-100..600` | `gray-100..600` | 背景/邊框/次要文字 |
| `--color-black` `#222` | `black`(或自訂) | 預設文字 |
| `--color-border-default`(=gray-400) | `border` | 表格/輸入框邊框 |

- **建議走 Tailwind v4 `@theme`**：可直接 `--color-primary: #168ed1;`，維持「單一色源」精神，避免 config 與 CSS 兩份真相。
- 語意別名對應：`text-blue`→`text-primary`、`text-red`→`text-danger`、`text-gray`→`text-gray-600`、`text-default`→`text-black`。
- `--color-primary-linear`（漸層，用於 header 底線、footer 背景）沒有 utility 對應，設成 CSS 變數繼續用，或用 `bg-[linear-gradient(...)]` arbitrary。

### 1-3. 圓角/字級

- border-radius 全站只有 4px（`rounded`）、8px（`rounded-lg`）、2px（`rounded-sm`）、30px（膠囊，`rounded-full` 近似）。
- 字級：`text-md`(18px)→`text-lg`、`text-lg`(20px)→`text-xl`、`text-xl`(24px)→`text-2xl`（注意命名偏移，別直接同名對應）。

---

## 2. 斷點：本專案是 max-width（mobile-last），Tailwind 預設是 min-width（mobile-first）——**必須自訂，不可直接套 `md:`**

本專案用 `max-width: 992px` 與 `768px`（見 `_utilities.scss`、各元件 scss；另有 991/767 的 `.message-content`）。Tailwind 預設 `sm=640 / md=768 / lg=1024` 是 min-width，語意相反、且沒有 992。請自訂 max-width 斷點：

```js
// tailwind.config（v3）
screens: {
  'max-lg': { 'max': '992px' },   // 對應本專案 .col-*-sm / .mobile-column 的 992 斷點
  'max-md': { 'max': '768px' },   // 對應 .col-*-xs / .mobile-column-xs
}
```
```css
/* 或 v4 @theme */
--breakpoint-...  /* v4 需以 @custom-media 或 @variant 處理 max-width，見 Tailwind v4 文件 */
```

轉換對應：`col-6-md col-12-sm`（≤992 變整寬）→ `w-1/2 max-lg:w-full`；`mobile-column`（≤992 轉直排）→ `flex-row max-lg:flex-col`。**col 系統建議改用 CSS Grid**（`grid grid-cols-12` + `col-span-*`）——Grid 的 gap 不吃欄寬，比本專案 flex+calc 扣 gap 的作法更乾淨。

---

## 3. utility 層（`_utilities.scss`）→ Tailwind utility（機械對照，約占轉換量的大宗）

markup 那 ~180 處工具 class 幾乎 1:1：

| 專案 | Tailwind |
|---|---|
| `flex-row` | `flex` |
| `flex-row column` / `.column` | `flex flex-col` |
| `gap-16`（等尺標） | `gap-4`（÷4） |
| `align-items-center` | `items-center` |
| `justify-content-between` | `justify-between` |
| `flex-wrap` | `flex-wrap` |
| `col-6-md` | `w-1/2`（或 grid `col-span-6`） |
| `mt-24` / `mb-*` / `my-*` | `mt-6` … |
| `text-center` / `text-left` / `text-right` | 同名 |
| `text-bold`（=500） | `font-medium`（注意：是 500 不是 bold） |
| `text-md/lg/xl` | `text-lg/xl/2xl`（見 1-3 偏移） |
| `hidden` | `hidden` |
| `w100` | `w-full` |
| `flex-1`（`flex:1 1 0;min-width:0`） | `flex-1 min-w-0` |
| `flex-shrink-0` | `shrink-0` |
| `relative` | `relative` |
| `ellipsis-1` | `truncate` |
| `ellipsis-2/3` | `line-clamp-2/3` |
| `sr-only` | `sr-only` |

狀態 class（`.active/.open/.done/.collapsed/.disabled/.error`）→ React state 驅動的 conditional className（GUIDELINE §7 已如此規劃）。`:has()`（`.form-group:has(.error)`、`td:has(.form-checkbox)`）→ 在 React 直接用 state/prop 判斷加 class，比 `has-[]` variant 更清楚。

`.text-left/center/right`、`mt-*` 等在本專案帶 `!important`（utility 覆寫層）；Tailwind 的 utility 本就靠 layer 勝出，通常不需 `!`。

---

## 4. 元件外觀 scss → 元件 utility（一元件一資料夾，逐一轉）

`src/_includes/{ui,components}/<name>/_<name>.scss` 是自足的具名元件樣式，值都乾淨（剛做過對編譯 css 的逐 class 稽核）。一個元件產一個 `.tsx`，把它的 scss 規則翻成 utility 串或 `@apply`。變體 class（本專案已刻意用變體而非跨元件覆寫，如 `.button-primary`、`.divider-vertical.sm`、`.link-modal.on-dark`、`.tab.on-record`、`.message-content.in-compare`、`.list-style-disc.line-loose`）→ 對應成 props/variant（如 CVA、或條件 className）。

例：
```
.button { display:inline-flex; align-items:center; gap:.25rem; padding:.5625rem 1rem;
          border-radius:4px; font-weight:500; line-height:normal; ... }
.button-primary { background: var(--color-primary); color:#fff; }
```
→ `<button className="inline-flex items-center gap-1 px-4 py-2 rounded font-medium leading-none ...">`；primary variant 加 `bg-primary text-white`。（`py` 取 `.5625rem`≈9px，非尺標值→用 `py-[9px]` arbitrary，或微調設計對齊 `py-2`。）

---

## 5. 逃生口：**這些不要 utility 化，保留成一份薄 CSS（或 plugin）**

utility-first 先天做不到以下情境，硬轉會滿頁 arbitrary value 或直接錯。集中成一支 `app.css`/元件旁 CSS 承接即可：

1. **執行期產生的內容（最重要）**：`src/_includes/components/chatroom/_chatroom.scss` 的 `.robot-msg` 對 markdown 產生的 `h1~h6/p/ul/ol/li/code/pre/blockquote/table/th/td/hr/a` 用後代選擇器上樣式。這段 HTML 由 API/markdown 於執行期生成，**開發者無法在那些標籤加 class**（§3-2）。→ 保留這段 CSS，或改用 `@tailwindcss/typography` 的 `prose`（但 prose 會換掉這裡調過的設計值，需比對）。同類：`_collapse-text.scss`（`.collapse-text .collapse-body`）、`.prompt-content`。
2. **捲軸**：`src/scss/_mixin.scss` 的 `scrollbar()/scrollbar_thin()/scrollbar_modal()`（`::-webkit-scrollbar*` + Firefox `scrollbar-width/color`），用於 10 個元件。Tailwind **無對應 utility** → 保留 mixin 成 CSS，或裝 `tailwind-scrollbar` plugin。
3. **偽元素貼背景圖**：麵包屑 `/` 分隔（`li+li::before`）、必填 `*`（`.control-label.required::after`）、下拉/收合箭頭（多處 `::after` 貼 `url(...)`）。Tailwind 的 `before:`/`after:` 要配 arbitrary（`after:content-[''] after:[background-image:url(...)]`）很醜 → 保留成 CSS。
4. **漸層**：`--color-primary-linear`（header 底線 `border-image`、footer 背景）→ CSS 變數或 arbitrary。

---

## 6. 建議工作流（給 agent）

1. 建 Tailwind theme：貼 `_var.scss` 色盤 + 間距（記得 px÷4）+ 自訂 max-width 斷點。
2. 建一支 `app.css`（`@layer base/components`）承接第 5 節的逃生口（scrollbar mixin、`.robot-msg` typography、偽元素箭頭），這是唯一保留的手寫 CSS。
3. 逐元件轉：讀 `_<name>.scss` → 產 `<Name>.tsx`，外觀翻 utility、變體翻 props、狀態翻 conditional className。
4. 頁面 markup：工具 class 照第 3 節對照表換；`col-*` 建議改 Grid。
5. 驗證：對照本專案 build 後的 `dist/`（每頁外觀）逐頁比對，值以本專案為準（已對齊真 app 編譯 css）。

一句話：**日常排版/間距/顏色/元件外觀交給 utility，第 5 節那 ~20% 留一支薄 CSS**——產出會是乾淨、慣例一致的 Tailwind + 一層逃生口 CSS，而不是滿頁 arbitrary value。
