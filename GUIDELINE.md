# 切版規範（規格書）

本文件是這個專案的**規範**：定義檔案結構、語法白名單、各層級的規則，以及與 React 的對應關係。
適用對象：維護本專案的人與協作的 AI，以及將本專案轉換成 React 的人與 AI。
本專案是 GufoFAQ 前端切版的**唯一正本**。

> **本文件只放規則。** 規則的定義是：**新增一個頁面或元件時，本文件一個字都不用改**。
> 會隨專案變動的東西（檔案清單、元件清單、頁面清單、layout 各自提供什麼）一律放 [README.md](README.md)。
>
> **規則多數已寫成測試**（`tests/guideline.test.mjs`，`npm test` 與 CI 都會跑）。改完 `npm run check` 要綠。

核心原則（工作約定）：

1. **共同語言**：class 命名沿用既有設計系統的詞彙（`.header`、`.modals`、`.form-group`…），新元件跟隨同樣風格——命名是共同語言，不另立一套。
2. **本文件是唯一標準**：寫法一律以本 GUIDELINE 為準（§2 語法白名單、§4 HTML/CSS、§5 JS）。動到既有程式碼時，發現不符規範的寫法就地修正——「本來就這樣寫」不是豁免理由。
3. **元件只有一份正本**：檔案組織照 §1（一個元件一個資料夾，html + scss + js 同住）；要用就 include，要改就改它資料夾裡那一份。
4. **維持可轉換**：架構保持 React-friendly——include＝元件、set＝props、front matter + `{% for %}`＝資料渲染（§7 是轉換對照契約）；行為一律原生 JS（§5），不引入第三方前端套件。

---

## 1. 檔案結構

**慣例**（實際檔案清單見 [README.md](README.md)——那裡才是隨專案變動的現況；本節只定義結構規則）：

```
src/
├── _includes/
│   ├── layouts/            ← 整頁模板 + 模板專屬樣式 `_<模板名>.scss`（不放元件）
│   ├── components/         ← 大元件：會用到其他元件的組合區塊
│   │   └── <元件名>/       ←   一個元件 = 一個資料夾
│   │       ├── <元件名>.html      ←   元件 HTML（唯一正本）
│   │       ├── _<元件名>.scss     ←   元件樣式（有才放；要在 main.scss @use）
│   │       └── <元件名>.js        ←   元件行為（有才放；要三方登記，見 §5）
│   └── ui/                 ← 小元件：不依賴其他元件的積木
├── scss/                   ← 全域層：token / mixin / reset / base / utilities / main（元件樣式不放這）
├── i18n/en.json            ← 英文翻譯（繁中是原文、留在 markup，見 §4-2）
├── images/
└── pages/<section>/<頁面>.html   ← 頁面 = 選 layout + 元件組合
```

- 頁面原始碼依 section 分資料夾，但 `permalink` 一律輸出**扁平檔名**到 `dist/` 根，確保每頁的 `./css`、`./js`、`./images` 相對路徑一致。
- `dist/` 是 build 產物，不可手動編輯。

### 1-1. 放置規則（三個桶）

| 桶 | 判斷句 | 例 |
|---|---|---|
| `layouts/` | 是整頁的**模板**嗎？ | `base.html`、各種 `*-shell.html` |
| `components/` | 它**會用到其他元件**，或是某大元件的**專屬子片段**嗎？ | header、sources-block、multi-select-box、mobile-nav |
| `ui/` | **不依賴任何其他元件**？ | button、modals、pagination、block、storage-bar |

**「用到其他元件」三種形式**（任一成立即歸 `components/`）：`{% include %}` 它、在自己的 markup 寫它的 class（如 modal 寫 `.modals`）、js 呼叫它匯出的全域函式（如 `openModal()`）。

**判斷依賴時只看 scss + js + 生產 markup。** `<元件名>.html` 有兩種身分：被真實頁面 include 的是**生產 markup**；只被元件總覽頁 include 的是**展示片段**——展示片段為了示範情境會用到別的元件，不算依賴（否則每個原子都會被推去 `components/`）。

「專屬子片段」指由某個大元件 include、不會單獨使用的部分：`mobile-nav`（header 的手機版選單，共用 header 的 `menuItems`）、`step-nodes`（step-btn-wrap 的步驟點）。它們即使零依賴也放在 `components/`。

**`layouts/` 的樣式跟模板同住**：模板不是元件（無 markup、無行為、只服務單一模板），它的專屬樣式放 `layouts/_<模板名>.scss`，不進 `components/` 也不進全域 `scss/`。

### 1-2. 元件檔案規則

- html / scss / js 三種檔案**有才放**：純樣式元件只有 scss（button）、純行為元件只有 js + scss（accordion）
- 有 scss → 在 `scss/main.scss` 對應分組加一行 `@use`
- 有 js → 在 `eleventy.config.js` 的 passthrough 清單和 `layouts/base/base.html` 的 script 清單各加一行
- 同一個元件絕不複製貼上；要用就 include，修改只改它資料夾裡的那一份
- 誰的按鈕開的彈窗，彈窗就 include 在誰裡面（例：footer 內含 disclaimer-modal）

---

## 2. 模板語法白名單

全專案**只允許**以下 4 個模板語法，其他（macro、filter、shortcode、自訂 data 檔等）一律禁止：

| 語法 | 用途 | React 對應 |
|---|---|---|
| front matter（檔首兩條 `---` 之間的 YAML） | 頁面設定（layout、title、permalink）與頁面資料 | props / API 資料 |
| `{% include "桶/元件/檔.html" %}` | 引入元件 | `<Component />` |
| `{% set 名 = 值 %}` | include 前傳參數 | props |
| `{% for x in 清單 %}…{% endfor %}`（搭配 `{% if %}`） | 渲染重複結構 | `.map()` |

例外：`layouts/` 內的 `{{ content | safe }}` 是固定管線（頁面內容的注入點），不需修改。

**註解**：要註解模板碼一律用 nunjucks 註解 `{# … #}`（build 時被移除、不進輸出，轉 React 時對應 `{/* */}`）。不要在 HTML 註解 `<!-- -->` 內寫 `{% %}`／`{{ }}`——即使在註解裡 nunjucks 仍會解析而出錯。`{# #}` 不算「第 5 種語法」，它是註解機制、不產生任何 markup，白名單的 4 個語法指的是會產生輸出的模板結構。

`{% set %}` 的變數在 include 後**不會消失**（整頁共用）：同頁第二次使用同元件必須重新 set 全部參數；不同元件的參數名不可相同。

---

## 3. 頁面規則

### 3-1. front matter 必填欄位

```yaml
---
layout: layouts/page-shell/page-shell.html        # 或 layouts/base/base.html
title: GufoFAQ::頁面標題
titleKey: nav.dataImport               # 「頁面標題」那段的 i18n key（見 §4-2）
pageHeading: 資料匯入                   # 頁面標題（繁中原文），page-shell 用它產生本頁唯一的 <h1>
permalink: 檔名.html                   # 輸出到 dist/ 的檔名
# （頁面資料寫在這之後）
---
```

- `titleKey`：切英文時 `<title>` 會變成 `GufoFAQ::` + 該 key 的英文。頁名與既有 key 的繁中相同就沿用，別另創。
- `pageHeading`：**每頁必須恰好一個 `<h1>`**（有測試把關）。`page-shell` 用它產生 `<h1 class="sr-only" data-i18n="{{ titleKey }}">`——多數頁面的視覺標題其實是麵包屑或資料值（檔名／資料集名），故 h1 走 sr-only。**logo 不是 h1**（它是回首頁的連結）。
- `titleKey` / `pageHeading` **只有走 `page-shell` 的頁面必填**（它靠這兩個欄位產生 h1）；用其他 layout 的頁面，自己在內容裡放唯一的 h1。

> 各 layout 分別自動提供什麼、目前有哪些頁面用哪個 layout —— 見 [README.md](README.md)。

### 3-2. 內容區規則

- 區塊順序 = include 的行序；調整版面 = 調整行序
- 重複資料（表格列、選項清單）寫在 front matter，元件用 `{% for %}` 渲染；範例資料放 2~3 筆即可
- 短欄位（編號、時間、標題）資料化放 front matter；**長文／格式化內容**（AI 回答、免責聲明全文）直接寫在元件當樣式示範，不進 front matter——它在正式環境是 API 回傳或 markdown 渲染，這裡只示範它的長相
- 一次性版面直接寫在頁面檔，不抽元件

### 3-3. 什麼該切成元件

1. 出現在 2 頁以上 → 切
2. 同一頁內重複出現 → 切（轉換後是 `.map()`）
3. 有自己的互動行為 → 切（js 跟著元件走）
4. 一次性版面 → 不切

---

## 4. HTML / CSS 規則

- **class 命名沿用既有系統**（`component.scss` 的詞彙：`.header`、`.modals`、`.form-group`、`.accordion-btn`…）；新元件的命名跟隨同樣風格
- 狀態 class 沿用既有慣例：`.active`、`.open`、`.done`、`.error`、`.disabled`（轉換後 = React state / props）
- SCSS 寫法沿用既有風格（巢狀、`&` 修飾）；**顏色一律用 `_var.scss` 的語意 token（`--surface`／`--text`／`--brand`／`--border`／`--shadow`…），完全不寫裸 hex（含白色與陰影，無例外）**。token 是**單層、直接給值、無別名**（沒有 `--color-*` 原色層）；元件不碰色值、只掛語意 token。showcase 頁 `_guideline` 另有自己的 `--gl-*` 色盤（見 §9）
- **顏色 token 的「填充」與「文字」必須分家**：同一個品牌色當**填充**要夠深（疊在上面的白字才讀得到），當**文字**在深色模式又要夠亮（黑底才讀得到）——這兩個需求互相矛盾，不能共用一個 token。故 `background-color`／`border-color` 用 `--brand`／`--danger`，`color:` 一律用 `--brand-text`／`--danger-text`。
- **對比度是硬規則**：任何有色填充配 `--on-accent` 白字必須 ≥ 4.5:1（WCAG AA 內文），且填充對底色 ≥ 3:1（1.4.11 UI 元件）。填充天生太亮而放不下白字者（`--warning` 黃底）配 `--on-warning` 深字——這是唯一例外，不要擴大。**新增或調整任何顏色都要重算這兩個數字。**
- **深色模式（護眼）＝覆寫 token，不改元件**：深色由 `_var.scss` 的 `[data-theme="dark"]` 覆寫同一組語意 token 達成；元件只用 token 故自動換膚，**不需也不該在元件 scss 寫 `[data-theme=dark]` 分支**（唯二例外：`ui/theme-toggle` 的日／月圖示切換、光柵 PNG 圖示的深色 filter／換圖——這兩者 CSS token 換不動）。主題旗標掛 `<html data-theme>`，由 `base.html` `<head>` 的 no-flash 內聯腳本初始化（讀 localStorage → 否則跟系統），`ui/theme-toggle` 點擊切換。**新增任何顏色＝在 `_var.scss` 同時給 light 與 dark 值**
- 每個元件的 scss 只寫自己的 class；**A 元件的 scss 禁止出現 B 元件的 class**（無例外：外觀覆寫改成 owning 元件的 variant class，如 `link-modal.on-dark`、`list-style-disc.line-loose`；容器排版子元件改用 parent 自有的 slot class，如 `.select-submit`、`.chat-input-control`、`.filter-field`、`.ab-side`）
  - 分清「用」與「改」：**沿用**別元件的 class 當 markup 可以；要**覆寫**其尺寸/排版時（連加一條 `max-height` 都算），加 parent 自有 slot class 再寫規則（如 `tab-wrap qa-side-tab-wrap`），不直接寫別人的 class 選擇器
  - 父 shell 定義、專屬子片段消費的版面 `custom property`（如 shell 的 `--header-height`）屬**允許的父子耦合**，不算跨元件洩漏
- 禁止依頁面覆寫元件（`.page-xxx .button {...}`）；頁面專屬的一次性樣式也要歸戶成**純樣式元件**（無 html/js 只有 scss，如 `ui/ab-test-block`），不放全域樣式表
- **間距一律用工具 class**：水平間距交給 `flex-row` 的 `gap-*`；垂直（區塊與區塊之間）用 `mt-*`／`mb-*`／`my-*`（尺標同 gap：4, 8, 10, 12, 16, 20, 24, 32, 40），歸零用 `m-0`。**不要寫行內 `style="margin-..."`**；間距值不在尺標上時優先靠齊尺標（±2px 屬可接受誤差），真的必須保留才允許行內 style 並註記原因
- **目標是轉出的 React／Tailwind 零行內 style。** 切版因無 utility 系統，欄寬用 `<col style="width:...">`、JS 切換顯示用 `display` 行內先當替身——轉換時這兩者一律變成 class（欄寬 → `w-[N]`；display → conditional `className` 的 `hidden`/`block`，見 TAILWIND-CONVERSION）。**唯一無法消除、會留在行內的是「資料驅動的執行期尺寸」**（如 storage-bar `width: 84.3%` 來自真實資料 → `style={{width}}`；runtime 值沒有對應的 build-time class）。**顏色、字級、間距一律不寫行內。**
- 工具 class 是「最後一手」的覆寫層：間距（`mt/mb/my/m-0`）、顯示（`hidden`）、對齊（`text-left/center/right`）帶 `!important`（等同其所取代的行內 style 的優先權），元件樣式不可依賴蓋過它們；文字大小/顏色工具不帶 `!important`（允許元件情境覆寫）——唯一例外是 `.text-default`：它是「強制回預設字色」的逃生口，工具層在 `main.scss` 早於元件層載入，不帶 `!important` 就壓不過元件色
- 欄位系統：`.col-N-*` 欄寬以 calc() 自動扣除該列 gap 分攤，同列 span 總和 = 12 時恰好填滿一行（搭配 `.flex-wrap` 不會提早掉行）；直向排列（`.column`／斷點下的 `.mobile-column(-xs)`）時不扣，`.col-12-*` 恆為整寬。用法見元件總覽頁的「04 欄位」節
- **HTML 巢狀必須合法**：`span`／`p` 內不可放區塊元素（`div`、`ul`、`table`…）——瀏覽器會容錯，但轉 React 時 SSR/hydration 會報錯。長文/富文字容器（如 chatroom 的 `.robot-msg`）一律用 `div`。（`<a>` 是 HTML5 transparent content model，**可以**包區塊元素，如 `upload-card` 的 `<a>` 包整張卡。）
- **可及性（a11y）基本要求**：圖示按鈕要有可及名稱（`title` + `.sr-only`、`aria-label`，或按鈕內的 `.tooltip` 文字）；label 與表單控制項以 `for`/`id` 關聯（同一元件在頁面重複出現時，id 用迴圈變數組唯一值，見 `ui/form-control` 示範），沒有可見 label 的控制項（如聊天輸入框）加 `aria-label`；不輸出空屬性（`for=""`、`name=""`、`id=""`）；裝飾性圖片 `alt=""`、有語意的圖片給有意義的 alt
- **不要用 div 假扮控制項**：可點的東西一律用真 `<button type="button">`／`<a>`。`div[role="button"][tabindex="0"]` 少了 Enter/Space（WCAG 2.1.1），原生按鈕免費具備。模擬 select 也用 `<button class="form-control">`
- **狀態要寫進 ARIA**：可開合的控制項（下拉、accordion、側欄、多選）掛 `aria-expanded`，且**每一條改變狀態的路徑都要同步**（含「全部展開／收合」與「點外部收合」）；`<dialog>` 用 `aria-labelledby` 接上自己的 `.modals-title`；動態出現的訊息要在 live region 裡（toast 容器 `role="status" aria-live="polite"`、錯誤訊息 `role="alert"`）
- **`<img>` 一律帶 `width`／`height`**（原生尺寸即可，CSS 仍可覆寫）：提供 aspect-ratio、消除版位跳動；再加 `decoding="async"`。站上圖多為首屏 icon，**不要**加 `loading="lazy"`

### 4-1. 現代瀏覽器基底（`_base.scss` 提供，元件不得破壞）

`_base.scss` 已一次給齊下列全域規則。**元件的職責是不要重寫、不要蓋掉它們**：

| 全域規則 | 元件該怎麼配合 |
|---|---|
| `color-scheme: light` / `[data-theme="dark"] { color-scheme: dark }` | 不用管。這層讓原生 UA 元件（`<select>` 展開的選單、date/time picker、autofill 底色、捲軸角落）跟著主題走——**token 換不到這層** |
| `*, ::before, ::after { box-sizing: border-box }` | **元件不要再寫 `box-sizing: border-box`**（少數要 `content-box` 才自行覆寫） |
| `:where(a,button,input,select,textarea,summary,[tabindex]):focus-visible { outline: 2px solid var(--brand-text) }` | **禁止裸寫 `outline: none`**。真的要蓋掉，必須同時給可見的 `:focus-visible` 樣式；複合元件（如 multi-select）把焦點環畫在外框 `:focus-within` 上 |
| `@media (prefers-reduced-motion: reduce)` 關閉動畫／過渡 | 不用管，照常寫 transition |
| `img, svg, video, canvas { max-width: 100% }` | 不用重複寫 |

- **`100vh` 一律配 `100dvh`**：`height: 100vh; height: 100dvh;`（前者是舊瀏覽器 fallback）。行動瀏覽器的 `100vh` 含會伸縮的網址列，會把底部的輸入框／footer 裁掉。

### 4-2. i18n（繁中＝原文，英文＝翻譯檔）

**繁中是原文、留在字串出現的地方；英文放 `src/i18n/en.json`。** 不可把繁中抽進 `zh.json`——那會讓 HTML 變空殼、破壞無 JS 基準，也破壞「`data-i18n="key">文字</` → `{t("key")}`」的 React 轉換契約。

- 可見文字：`<span data-i18n="qa.records">問答紀錄</span>`
- 屬性：`data-i18n-title` / `-aria-label` / `-placeholder` / `-alt` / `-toast`（marker 後綴＝目標屬性）
- **由元件 js 讀 `data-*` 資料槽再畫出來的文字**（如 multi-select 的 `data-placeholder`）不在上表的自動翻譯範圍：另給一個 `data-<槽名>-key` 帶 i18n key，元件 js 用它走 `GufoI18n.t(key, 繁中原文)`（見 §5）
- 分頁標題：front matter 的 `titleKey`（見 §3-1）
- **同一個 key 的繁中原文必須一致**：切回繁中時的預設值是**從 DOM 就地擷取、以 key 為索引**，同 key 不同繁中會互相覆蓋。頁名與既有 key 的繁中相同才沿用，不同就另立 key
- **只翻 UI chrome，不翻假資料**：聊天訊息、提示詞、免責聲明內文、示範檔名／資料集名、表格 cell 值、示範 Excel 欄位一律不翻。`component.html`（元件總覽）與 `catalog.html`（頁面目錄，輸出成 index.html）是 showcase，不在 app 範圍
- 新增 key 就要在 `en.json` 補英文。**漏了不會壞，只會在英文模式默默顯示繁中**——所以驗收一定要 runtime 逐頁看（見 §8）

---

## 5. JS 規則：元件的行為跟元件住在一起

每個有互動的元件，行為寫在自己資料夾的 `<元件名>.js`：

```
ui/pagination/
├── pagination.html
├── _pagination.scss
└── pagination.js     ← 這個元件的行為
```

### 寫法規則

- **只用標準 DOM API**（`querySelectorAll`、`addEventListener`、`classList`、`closest`…，MDN 查得到的才能用）；禁止 jQuery 與任何第三方套件
- 只操作**自己元件**的 class；要操作別的元件，呼叫該元件 js 提供的函式（例：footer.js 呼叫 modals.js 的 `openModal()`）
- 包在 `DOMContentLoaded` 裡綁定；同元件可能出現多次時用 `querySelectorAll().forEach()`
- 跳窗用 `<dialog>` 元素 + `showModal()` / `close()`（標準 API，與既有切版相同）
- **JS 不得寫死要顯示的字串。** 由 JS 產生／切換的文字（accordion 的展開↔收合、multi-select 的空狀態、prompt-edit 的按鈕字…）走 `window.GufoI18n.t(key, "繁中原文")`；除了寫入文字，**還要同步改寫該元素的 `data-i18n` / `data-i18n-title` key**，並監聽 `gufo:langchange` 依「當下狀態」重畫。否則英文模式下一互動就冒出繁中（`lang-toggle.js` 匯出這兩者）
- **CSS 改不了 ARIA。** 用 CSS 做開合（`:hover` / `:focus-within`）時，配一支只做一件事的小 js 去同步 `aria-expanded`（見 `components/header/header.js`）
- 把原生語意換掉就要自己補回來：`ui/multi-select` 把原生 `<select>` 設 `aria-hidden` + `tabindex="-1"` 移出無障礙樹，所以自訂控制項必須自帶 `role=combobox/listbox/option`、`aria-controls`／`aria-activedescendant`／`aria-selected`，與 ↑↓／Enter／Esc／Home／End 鍵盤操作

### 新增元件 js 的登記（各加一行）

1. `eleventy.config.js`：passthrough 清單加 `"src/_includes/桶/元件/元件.js": "js/元件.js"`
2. `layouts/base/base.html`：script 清單加 `<script defer src="./js/元件.js"></script>`

### tag 多選（`ui/multi-select`）

tag 式多選由本範本提供（切版需要展示互動）：在原生 `<select multiple class="multiSelect">` 上加 `ui/multi-select/multi-select.js`，增強成標籤（可 `×` 移除）＋下拉複選（不關閉）＋搜尋過濾＋placeholder。**原生 `<select>` 仍是唯一資料來源**——操作都寫回它的 `option.selected` 並觸發 `change`。轉 React 時對應 `react-select`（isMulti），value 陣列＝原生 select 的選取。

### 不在切版範圍的互動

日期選擇、表單驗證、資料載入：保留原生元素或靜態外觀，由 React 套件實作。

---

## 6. 元件的資料契約

- **元件不得寫死「會因使用它的頁面而異」的資料。** 這類資料由頁面在 include 前 `{% set %}` 提供（依 §3-2「重複資料放頁面」），元件只負責 `{% for %}` 渲染——轉 React 即 props。
- 兩種資料**可以**住在元件裡：(a) **全站不變的結構性設定**（如 header 的導覽選單）；(b) **純示範用的假資料**（同 §3-2：示範內容直接寫在元件當樣式示範）。一旦某頁需要不同的值，就由該頁 `set` 覆寫。
- 同頁重複使用同一元件時，**每次 include 前重新 set 全部參數**（§2：`set` 是全域的，上一次的值會留著）。
- 元件吃哪些參數、include 了哪些子元件——寫在**該元件 html 的檔頭註解**（唯一正本），不在本文件維護清單。
- 有些元件不用 include，直接在 markup 寫它的 class（`button`、`modals`…）；有些由 layout 自動提供（`header`、`footer`）。

> 目前有哪些元件、各自吃什麼參數、誰內含誰 —— 見 [README.md](README.md) 的「元件使用一覽」。

---
## 7. React 轉換對照

| 本專案 | React |
|---|---|
| `layouts/page-shell/page-shell.html` | route layout（Next.js `layout.tsx`、React Router `<Outlet />` 外層） |
| `components/xxx/`、`ui/xxx/` | 一個 component 資料夾（`Xxx.tsx` + 同名 scss） |
| 元件的 `_xxx.scss` | **原樣複製**到元件旁 `import './xxx.scss'`，不改寫 |
| 元件的 `xxx.js` | 行為規格：改寫成該元件的 `useState` / 事件處理（DOM 操作 → state 驅動） |
| `{% include %}` | `<Xxx />` |
| `{% set xxx %}` | props |
| front matter 資料 + `{% for %}` | `data.map(item => <Row item={item} />)` |
| `.open`、`.active`、`.done`、`.error` 狀態 class | `useState` 布林 / props（`className={open ? "x open" : "x"}`） |
| `<dialog>` + `showModal()` | React 可沿用 dialog，或換 Dialog 元件 |
| `<a data-i18n="key">文字</a>` | `{t("key")}`（next-intl 等）；`src/i18n/en.json` 直接當英文 message catalog，繁中原文由 markup 抽出成 zh catalog |
| `GufoI18n.t(key, "繁中")` / `gufo:langchange` / `lang-toggle.js` | **不帶過去**：runtime 就地切換是切版專用；React 用 i18n library 的 `t()` 與語言 context |
| `ui/multi-select`（增強原生 `<select multiple>`） | `react-select`（isMulti）；value 陣列＝原生 select 的選取，行為（標籤／搜尋／複選）即規格 |
| `_var.scss` 顏色變數 | 全域引入一次，元件照用 `var(--...)` |

accordion 的行為規格（`ui/accordion/accordion.js`）：各列**獨立開合**（點哪列就 toggle 哪列，不會自動關其他列），掃描根為 accordion 自有的 `.js-accordion`（原子，不綁定任何 `components/` 的 class）。轉 React 時由各 accordion 元件自管開合狀態（`useState` 記住開啟的列），不要跨元件共用一份全域狀態。

HTML → JSX 為機械式替換：`class`→`className`、標籤自閉合、`{# #}`→`{/* */}`。
CSS 不需任何翻譯：交付的樣式即正式環境的最終樣式。

> 預設走「scss 原樣複製」如上。**若 React 團隊改選 Tailwind**，本專案的 token/尺標/utility 層已刻意做成好轉——轉換配方（theme 映射、max-width 斷點、哪些逃生口須保留成 CSS）見 [`TAILWIND-CONVERSION.md`](TAILWIND-CONVERSION.md)。

---

## 8. 交付前檢查清單

- [ ] `npm run check` 綠（stylelint → build → test，測試把本規範的規則跑成斷言）；`dist/` 每一頁雙擊可開、外觀與互動正確
- [ ] 沒有 jQuery 與任何第三方 JS 套件；js 只用標準 DOM API
- [ ] 每個有互動的元件：js 在自己資料夾，且已在 `eleventy.config.js` 與 `base.html` 登記
- [ ] 重複區塊都是 include；重複列／選項用 `{% for %}` + front matter 資料
- [ ] class 命名沿用既有系統；新顏色定義在 `_var.scss`（light + dark 都要給）
- [ ] 放對桶：整頁模板 → `layouts/`；會用到其他元件 → `components/`；零依賴 → `ui/`
- [ ] 只用了 §2 白名單內的模板語法
- [ ] 沒有行內 style 的間距/顏色/字級（只允許 §4 的三種合法用途）；間距都在尺標上
- [ ] HTML 巢狀合法（span 內無 div/p/ul）；圖示按鈕有可及名稱；label 有 for/id 或控制項有 aria-label；無空屬性
- [ ] 每頁恰好一個 `<h1>`；沒有 `div[role=button]`；可開合控制項的 `aria-expanded` **每一條路徑**都同步；`<dialog>` 有 `aria-labelledby`
- [ ] 沒有裸 `outline: none`；元件沒有重寫 `box-sizing`；`100vh` 都配了 `100dvh`；`<img>` 都有 `width`/`height`
- [ ] 新顏色算過對比：白字 on 填充 ≥ 4.5:1、填充 on 底色 ≥ 3:1
- [ ] 新 key 都補了 `en.json`；**英文模式下逐頁 runtime 驗過，而且要實際觸發互動**（展開 accordion、開多選下拉、切主題）——JS 產生的字串靜態掃描看不到

---

## 9. Dos & Don'ts

```html
<!-- ❌ 每頁貼一份 header（170 行 × 6 頁） -->
<header class="header">...</header>

<!-- ✅ page-shell 自動提供；其他元件用 include -->
{% include "components/sources-block/sources-block.html" %}
```

```html
<!-- ❌ 表格列複製 16 次 -->
<tr>...</tr><tr class="detail-row">...</tr>
<!-- ……× 16 -->

<!-- ✅ 資料 + 迴圈，示意 3 筆（重複列的 markup 直接寫在迴圈內） -->
{% for source in sources %}
<tr>…{{ source.file }}…</tr>
<tr class="detail-row">…{{ source.content }}…</tr>
{% endfor %}
```

> ⚠️ Eleventy 陷阱：`{% include %}` 若**巢狀在被 include 的元件內部的 `{% for %}` 迴圈裡**，會渲染成空白（不報錯）。所以「每列再拆一個子元件用 include」這種寫法只在**頁面層**的 for 迴圈可行；元件內部要逐列渲染時，把列的 markup 直接寫在該元件的 for 迴圈內（如 `sources-block`）。

```js
// ❌ jQuery，且所有頁面的行為擠在一支 main.js
$(".accordion-btn").on("click", function () { $(this).toggleClass("open"); });

// ✅ 標準 DOM API，寫在 ui/accordion/accordion.js
btn.addEventListener("click", function () { btn.classList.toggle("open"); });
```

```scss
/* ❌ 在 A 元件的 scss 裡改 B 元件（§4 無例外） */
.sources-block .button { padding: 0; }
.qa-record .tab { color: ...; }         /* ❌ 跨元件覆寫 */

/* ✅ 各自的樣式寫在各自的檔案；跨元件覆寫改成 owning 元件的 variant/slot class */
.tab.on-record { color: ...; }          /* ✅ 由 ui/tab 提供變體，qa-record-tabs markup 掛用 */
```


```scss
/* ❌ 頁面/元件庫專屬 scss 用「裸元素選擇器」——打包進全站 main.css 會洩漏、影響每一頁 */
body { overflow: hidden; }   /* 頁面專屬規則洩漏出去，會關掉全站每一頁的捲動 */
aside { height: 100vh; }
footer { ... }

/* ✅ 頁面專屬樣式全部限定在該頁的 body class 底下（見 _guideline.scss 收進 .guideline-page） */
body.guideline-page { overflow: hidden; }
.guideline-page { aside { ... } footer { ... } }
```

> ⚠️ **裸元素選擇器（`html`/`body`/`aside`/`section`/`footer`…）只准出現在 `_normalize`/`_base`（全域 reset 的法定職責）。** 任何頁面專屬樣式（如元件庫頁 `_guideline`、目錄頁 `_catalog`）因為本專案把所有 scss 打包進單一 `main.css` 全站載入，裸選擇器會洩漏覆蓋全站——一律限定在該頁的 body class 底下。

```scss
/* ❌ 裸寫 outline: none —— 直接把 _base.scss 的全域焦點環蓋掉，鍵盤使用者看不到焦點在哪 */
.multi-select-search { outline: none; }

/* ✅ 要嘛不寫；複合元件把焦點環畫在外框上 */
.multi-select-control:focus-within { outline: 2px solid var(--brand-text); outline-offset: 2px; }
```

```js
// ❌ JS 寫死顯示字串 —— 英文模式下一點就冒繁中（靜態掃描抓不到）
btn.setAttribute("title", open ? "收合表格" : "展開表格");

// ✅ 走 i18n，並同步 key 讓之後切語言能依「當下狀態」重譯
var key = open ? "common.collapseRow" : "common.expandRow";
btn.setAttribute("title", GufoI18n.t(key, open ? "收合表格" : "展開表格"));
btn.setAttribute("data-i18n-title", key);
document.addEventListener("gufo:langchange", redraw);
```

> ⚠️ **量測陷阱：元件多半有 `transition`，切換主題／狀態後「立刻」讀 `getComputedStyle` 會拿到過渡中途的舊值。** 驗對比度或焦點環時，先注入 `*{transition:none!important}` 再量。

> ⚠️ **加全域規則前先做前後版面比對。** `*{box-sizing:border-box}` 這類規則會改變「原本沒宣告過」的元素的尺寸計算。做法：`git stash` → build → 用 playwright 擷取每個元素的 x/y/w/h 指紋 → 還原 → 再擷取 → 逐項比對，確認零位移再提交。

> ⚠️ **Showcase 頁的專屬色走專用色檔、不寫裸 hex**：`_guideline`（styles `component.html`）的 chrome 色（gotop 鈕、section 分隔線、說明面板…）是 showcase 自己的色、非 app token——收進 `_var` 會汙染「app 唯一色源」，故獨立成 `_guideline-var.scss`（`--gl-*`，定義在 `.guideline-page` 上，零全站足跡）。**架構不妥協：一樣走變數、不寫裸 hex，只是換一支色源檔。**（`_catalog` 用色恰好都是 app 色，直接用 `_var` token 即可。）
