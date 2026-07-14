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
│   ├── layouts/<模板名>/   ← 整頁模板 + 模板專屬樣式 `_<模板名>.scss`（不放元件）
│   ├── components/         ← 大元件：會用到其他元件的組合區塊
│   │   └── <元件名>/       ←   一個元件 = 一個資料夾
│   │       ├── <元件名>.html      ←   元件 HTML（唯一正本）
│   │       ├── _<元件名>.scss     ←   元件樣式（有才放；要在 main.scss @use）
│   │       └── <元件名>.js        ←   元件行為（有才放；要三方登記，見 §5）
│   └── ui/                 ← 小元件：不依賴其他元件的積木
├── scss/                   ← 全域層：色 token / 尺寸 token / mixin / reset / base / utilities / main（元件樣式不放這）
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

**「用到其他元件」三種形式**（任一成立即歸 `components/`）：`{% include %}` 它、在自己的 markup 寫它的 class（如 modal 寫 `.modals`）、js 呼叫**會產出可見 UI 的元件**匯出的函式（如 `ui/modals` 的 `openModal()`、`ui/toast` 的 `showToast()`）。**共享行為工具不算依賴**：`window.GufoSlide`（`ui/slide-toggle` 的高度動畫）、`window.GufoI18n`（`ui/lang-toggle` 的 `t()`）、`ui/scroll-lock`、`ui/print` 是全體元件通用的基礎設施，等同 DOM API——`ui/accordion` 用 `GufoSlide` 做開合、`ui/collapse-text` 用 `GufoI18n` 翻標籤，都仍是零依賴的原子。判準是「被呼叫的那個元件會不會生出一塊看得見的東西」，不是「有沒有呼叫別人的全域函式」。

**判斷依賴時只看 scss + js + 生產 markup。** `<元件名>.html` 有兩種身分：被真實頁面 include 的是**生產 markup**；只被元件總覽頁 include 的是**展示片段**——展示片段為了示範情境會用到別的元件，不算依賴（否則每個原子都會被推去 `components/`）。

「專屬子片段」指**被另一個元件 include** 的部分：`mobile-nav`（header 的手機版選單，共用 header 的 `menuItems`）、`step-nodes`（step-btn-wrap 的步驟點，也可由頁面單獨 include）。它們即使零依賴也放在 `components/`。

**`layouts/` 的樣式跟模板同住**：模板不是元件（無 markup、無行為、只服務單一模板），它的專屬樣式放 `layouts/<模板名>/_<模板名>.scss`，不進 `components/` 也不進全域 `scss/`。

### 1-2. 元件檔案規則

- html / scss / js 三種檔案**有才放**：純樣式元件只有 scss（`ui/ab-test-block`）、純行為元件只有 js + scss（`ui/modals`）
- 有 scss → 在 `scss/main.scss` 對應分組加一行 `@use`
- 有 js → 在 `eleventy.config.js` 的 passthrough 清單和 `layouts/base/base.html` 的 script 清單各加一行
- 同一個元件絕不複製貼上；要用就 include，修改只改它資料夾裡的那一份
- 誰的按鈕開的彈窗，彈窗就 include 在誰裡面（例：footer 內含 disclaimer-modal）。**反過來也成立：每個 `<dialog>` 在它出現的每一頁上都要打得開**（有測試在 dist 上把關），三條路擇一：同頁有 `data-open-modal` 指向它、有元件 js 呼叫 `openModal("它")`、或元件庫頁上有它的示範觸發器。真實頁上由業務 js 有條件開啟的彈窗走第三條（見 §5），否則沒有人看得到它

---

## 2. 模板語法白名單

全專案**只允許**以下 5 個模板語法，其他（macro、filter、shortcode、自訂 data 檔等）一律禁止：

| 語法 | 用途 | React 對應 |
|---|---|---|
| front matter（檔首兩條 `---` 之間的 YAML） | 頁面設定（layout、title、permalink）與頁面資料 | props / API 資料 |
| `{% include "桶/元件/檔.html" %}` | 引入元件 | `<Component />` |
| `{% set 名 = 值 %}` | include 前傳參數 | props |
| `{% for x in 清單 %}…{% else %}…{% endfor %}`（搭配 `{% if %}`） | 渲染重複結構；`{% else %}` 是清單為空時的空狀態列 | `.map()` / `list.length ? … : …` |
| `{{ content \| safe }}`（只出現在 `layouts/`） | 頁面內容的注入點 | `{children}` |

**註解**：要註解模板碼一律用 nunjucks 註解 `{# … #}`（build 時被移除、不進輸出，轉 React 時對應 `{/* */}`）。不要在 HTML 註解 `<!-- -->` 內寫 `{% %}`／`{{ }}`——即使在註解裡 nunjucks 仍會解析而出錯。`{# #}` 不算模板語法（它是註解機制、不產生任何 markup），故不在上表的 5 個之列。

`{% set %}` 的變數在 include 後**不會消失**（整頁共用）：同頁第二次使用同元件必須重新 set 全部參數；不同元件的參數名不可相同。

模板標籤的白名單就是這幾個關鍵字：`set` `for` `endfor` `if` `elif` `else` `endif` `include`（有測試逐字擋，含 `{%-` 這種空白控制寫法）。`{% from … import %}`、`{% macro %}`、`{% extends %}`、`{% raw %}`、block-set 的 `{% endset %}` 一律不准。

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
bodyClass: chatbot-page                # 選填：base.html 用它產生 <body class>，供 §9 的頁面專屬樣式限定用
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
- **註解對真 app／product 行為的斷言，寫時要對過正本並附出處**（`main.js:859`、`extract.py:25`）；頁面或元件改版時，同步更新描述它的註解——註解與 markup 說的必須是同一件事

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
- **顏色 token 的「填充」與「文字」必須分家**：同一個品牌色當**填充**要夠深（疊在上面的白字才讀得到），當**文字**在深色模式又要夠亮（黑底才讀得到）——這兩個需求互相矛盾，不能共用一個 token。故 `background-color`／`border-color` 用 `--brand`／`--danger`（hover 用 `--brand-hover`／`--danger-hover`），`color:` 一律用 `--brand-text`／`--danger-text`（hover 用 `--brand-text-hover`）。**填充族的 hover token 不可拿來當文字色**（它為了襯白字而壓深，在深色模式當文字讀不到）；**文字族反過來也不可當填充／邊框／陰影／SVG 的 `fill`・`stroke`**。**唯一的分界是遮罩**：`mask` 把整個 `background` 裁成字形，那顆顏色是墨色不是填充（它承載不了任何文字），故被遮罩的元素上 `background-color` 用文字族／墨色 token —— 這不是豁免，是「填充會襯白字」這個前提不成立。測試以層疊判定（規則的 compound 是否為某條帶遮罩 compound 的細化），不是看該條規則裡有沒有 `mask:`。
- 第三種角色是**前景墨色**（`--brand-ink`）：**文字**（標題、行內碼、選中頁籤）與**不承載文字的圖形記號**（勾記、radio 圓點、進度條、步驟底線）共用同一顆——兩者都是前景，需求不衝突。它套文字的門檻（疊表面 ≥ 4.5:1，自然也滿足圖形的 1.4.11 ≥ 3:1），但**不得反過來承載白字**。一顆 token 只能有一個角色——測試以角色清單為單一真相源，手打豁免清單就是偷加例外。
- **對比度是硬規則**：每個有色填充都配一個成對的前景 token（白字 `--on-accent` 或深字 `--on-warning`），兩者 ≥ 4.5:1（WCAG AA 內文）。用在**需要辨識邊界的控制項**（按鈕／輸入框／開關）的填充，對底色再 ≥ 3:1（WCAG 1.4.11）；純訊息填充（如 toast）的對比由文字承載，不受這條約束。**新增或調整任何顏色都要重算——有測試逐色實算把關，`_var.scss` 的每一顆 token 都必須在測試裡歸類成填充／文字／前景記號／表面／chrome，沒歸類就紅。**
- **深色模式（護眼）＝覆寫 token，不改元件**：深色由 `_var.scss` 的 `[data-theme="dark"]` 覆寫同一組語意 token 達成；元件只用 token 故自動換膚，**元件 scss 絕不寫 `[data-theme]` 分支（零例外）**。CSS 顏色換不動的東西有兩條路，**元件都不寫 `[data-theme]`**：①元件自己要用的（日／月圖示的顯示、插圖反相、底紋混色）在 `_var.scss` 給成**非顏色旗標**（`--theme-icon-*`、`--raster-invert`、`--pattern-blend`——值是 `block`／`none`／`invert()`／`multiply` 這類 CSS 關鍵字或函式，不是顏色），元件只掛 `var()`；②**單色 PNG 圖示一律用 `icon-mask()` 遮罩上色**（`_mixin.scss`）——PNG 的 alpha 就是字形，顏色交給語意 token，深色模式只是換值，故元件自己就換得動膚，不必反相、不必存 hover 版資產，彩色圖示也不會被翻掉色相；**只有 `<img>` 換不動**（CSS 選不到 `url()` 裡的顏色，也不能替 `<img>` 憑空生一個 mask url），故由全域的 `_dark-icons.scss` 依**檔名白名單** `img[src*="_black"]` 統一反相——這條規則不認識任何元件 class，新增黑圖示只要照命名慣例，不必回頭改它。彩色 `<img>`（徽章、檔型圖示）不反相。**只有全域層（`_var` / `_guideline-var` 的色源、`_base` 的 `color-scheme`、`_dark-icons` 的 `<img>` 檔名反相）允許讀主題旗標。**主題旗標掛 `<html data-theme>`，由 `base.html` `<head>` 的 no-flash 內聯腳本初始化（讀 localStorage → 否則跟系統），`ui/theme-toggle` 點擊切換。**那段 no-flash 腳本與 `<meta name="theme-color">` 是全站唯一允許複寫色碼的地方**（它跑在 CSS 之前，讀不到 `var()`），兩個值必須等於 `--surface-raised` 的淺／深色，有測試釘住；`theme-toggle.js` 則直接讀 computed 值，不複寫。**新增任何顏色＝在 `_var.scss` 同時給 light 與 dark 值**
- 每個元件的 scss 只寫自己的 class；**A 元件的 scss 禁止出現 B 元件的 class**（無例外：外觀覆寫改成 owning 元件的 variant class，如 `link-modal.on-dark`、`list-style-disc.line-loose`；容器排版子元件改用 parent 自有的 slot class，如 `.chat-input-control`、`.chat-input-submit`、`.filter-field`、`.ab-side`）
  - 分清「用」與「改」：**沿用**別元件的 class 當 markup 可以；要**覆寫**其尺寸/排版時（連加一條 `max-height` 都算），加 parent 自有 slot class 再寫規則（如 `tab-wrap qa-side-tab-wrap`、`.header-controls-slot`），不直接寫別人的 class 選擇器
  - 「用」的範圍限 `ui/` 原子、全域層（utilities／form-check）與元件自己的正本：**`components/` 元件的私有 class 不外借**——第二個元件需要同一塊樣式時，把它升格成共用正本（`ui/` 原子或全域 partial）再兩邊沿用
  - **markup 上的每個 class 都要有主人**：樣式正本（元件 scss／全域層）或行為掛點（hook class／js 狀態 class），兩者皆非的 class 不掛
  - 元件 scss **不得用 `#id` 選擇器**——那是比 class 更緊的耦合，且 id 是頁面層的東西
- 禁止依頁面覆寫元件（`.page-xxx .button {...}`）；頁面專屬的一次性樣式也要歸戶成**純樣式元件**（無 html/js 只有 scss，如 `ui/ab-test-block`），不放全域樣式表
- **兩個以上元件必須同值的斷點／尺寸，抽成全域層的 mixin 或 token**（斷點見 `_mixin.scss` 的 `nav-collapsed`，尺寸見 `_size.scss`）。判準是「**一邊改了、另一邊沒跟就會壞掉**」——`header` 的高度與 `mobile-nav` 浮層的起點是耦合；`992px`／`768px` 這種各元件各自收版的系統性斷點只是共用約定，不是耦合。各寫一份遲早走鐘
- **間距一律用工具 class**：水平間距交給 `flex-row` 的 `gap-*`（尺標 2, 4, 8, 10, 12, 16, 20, 24, 32, 40）；垂直（區塊與區塊之間）用 `mt-*`／`mb-*`／`my-*`（尺標少了最細的 2：4, 8, 10, 12, 16, 20, 24, 32, 40），歸零用 `m-0`。**不要寫行內 `style="margin-..."`**；間距值不在尺標上時優先靠齊尺標（±2px 屬可接受誤差），真的必須保留才允許行內 style 並註記原因
- **目標是轉出的 React／Tailwind 零行內 style。** 切版因無 utility 系統，欄寬用 `<col style="width:...">`、JS 切換顯示用 `display` 行內先當替身——轉換時這兩者一律變成 class（欄寬 → `w-[N]`；display → conditional `className` 的 `hidden`/`block`，見 TAILWIND-CONVERSION）。**唯一無法消除、會留在行內的是「資料驅動的執行期尺寸」**（如 storage-bar `width: 84.3%` 來自真實資料 → `style={{width}}`；runtime 值沒有對應的 build-time class）。**顏色、字級、間距一律不寫行內。**
- 工具 class 是「最後一手」的覆寫層：間距（`mt/mb/my/m-0`）、顯示（`hidden`）、對齊（`text-left/center/right`）帶 `!important`（等同其所取代的行內 style 的優先權），元件樣式不可依賴蓋過它們；文字大小/顏色工具不帶 `!important`（允許元件情境覆寫，零例外）。**要壓過元件的字色，改由 owning 層提供變體**（如 `.page-title.plain`），不要讓工具 class 帶 `!important` 硬壓——工具層在 `main.scss` 早於元件層載入，硬壓是把層疊順序當成規則在用
- 欄位系統：`.col-N-*` 欄寬以 calc() 自動扣除該列 gap 分攤，同列 span 總和 = 12 時恰好填滿一行（搭配 `.flex-wrap` 不會提早掉行）；直向排列（`.column`／斷點下的 `.mobile-column(-xs)`）時不扣，`.col-12-*` 恆為整寬。用法見元件總覽頁的「04 欄位」節
- **HTML 巢狀必須合法**：`span`／`p`／`button` 內不可放區塊元素（`div`、`ul`、`table`…；`button` 只吃 phrasing content，把 div 假扮的控制項換成真 button 時，內容也要一起換成 `span`）——瀏覽器會容錯，但轉 React 時 SSR/hydration 會報錯。長文/富文字容器（如 chatroom 的 `.robot-msg`）一律用 `div`。（`<a>` 是 HTML5 transparent content model，**可以**包區塊元素，如 `upload-card` 的 `<a>` 包整張卡。）
- **可及性（a11y）基本要求**：圖示按鈕要有可及名稱——`aria-label`、按鈕內的文字（`.sr-only` / `.tooltip`），或圖片的非空 `alt`。**單掛 `title` 不算**（輔具不保證會念，觸控與鍵盤焦點也看不到它），有測試把關
- **一組控制項要報出「這組在問什麼」**：一組 radio／checkbox／欄位沒有單一 `for` 可掛時，給那個浮空的 `<label>` 一個 `id`，容器掛 `role="radiogroup"`（或 `role="group"`）+ `aria-labelledby` 指向它。否則螢幕報讀器只念得出「設置一／設置二」，聽不出這組在選什麼；label 與表單控制項以 `for`/`id` 關聯，沒有可見 label 的控制項（如聊天輸入框）加 `aria-label`；不輸出空屬性（`for=""`、`name=""`、`id=""`、`href=""`）；裝飾性圖片 `alt=""`、有語意的圖片給有意義的 alt
  - **`role="group"` 的容器只能框「那一組」**：不可連同旁邊不屬於這組的控制項（送出鈕、無關的 switch）一起框，否則報讀器會把它們也念成這組的成員。旁邊的控制項要放在 group 容器**外**的 sibling（必要時把 group 收進一層只含 label＋該組的內層容器）
  - **id 在一頁裡必須唯一**（有測試在 dist 上把關）。同一元件在頁面出現多次時：**有迴圈變數就拿它組唯一 id**（`id="ms-{{ field.key }}"`、`id="applySample-{{ loop.index }}"`）；**沒有的**（如 `header-controls` 被 `header` 與 `mobile-nav` 各 include 一次）**一律不寫死 id**——改用 class + `querySelectorAll` 綁定、可及名稱用 `aria-label` 而非 `for`/`id`
- **不要用 div 假扮控制項**：可點的東西一律用真 `<button type="button">`／`<a>`。`div[role="button"][tabindex="0"]` 少了 Enter/Space（WCAG 2.1.1），原生按鈕免費具備。模擬 select 也用 `<button class="form-control">`。`role` 換成 `tab`／`checkbox`／`switch` 也一樣不行
- **`<button>` 不得省略 `type`**：預設值是 `submit`，放在表單裡就會誤送出（有測試把關）
- **狀態要寫進 ARIA**：可開合的控制項（下拉、accordion、側欄、多選）掛 `aria-expanded`，且**每一條改變狀態的路徑都要同步**（含「全部展開／收合」與「點外部收合」）；`<dialog>` 用 `aria-labelledby` 接上自己的 `.modals-title`；動態出現的訊息要在 live region 裡（toast 容器 `role="status" aria-live="polite"`、錯誤訊息 `role="alert"`）
- **`<img>` 一律帶 `width`／`height`**（原生尺寸即可，CSS 仍可覆寫）：提供 aspect-ratio、消除版位跳動；再加 `decoding="async"`。站上圖多為首屏 icon，**不要**加 `loading="lazy"`

### 4-1. 現代瀏覽器基底（`_base.scss` 提供，元件不得破壞）

`_base.scss` 已一次給齊下列全域規則。**元件的職責是不要重寫、不要蓋掉它們**：

| 全域規則 | 元件該怎麼配合 |
|---|---|
| `color-scheme: light` / `[data-theme="dark"] { color-scheme: dark }` | 不用管。這層讓原生 UA 元件（`<select>` 展開的選單、date/time picker、autofill 底色、捲軸角落）跟著主題走——**token 換不到這層** |
| `*, ::before, ::after { box-sizing: border-box }` | **元件不要再寫 `box-sizing: border-box`**（含 `-webkit-`／`-moz-`／`-ms-` 前綴版本；少數要 `content-box` 才自行覆寫） |
| `:where(a,button,input,select,textarea,summary,[tabindex]):focus-visible { outline: 2px solid var(--brand-text) }` | **禁止裸寫 `outline: none`**。真的要蓋掉，必須同時給可見的 `:focus-visible` 樣式。真正的控制項被藏起來或被包住時（`ui/switch` 的 1px input、`ui/multi-select` 的內層搜尋框），把焦點環畫在外框的 `:has(<那顆控制項>:focus-visible)` 上——**`:has()` 要指名那顆控制項**（不然外框內任何可聚焦元素都會點亮它），且**不要用 `:focus-within`**（它滑鼠點一下也會亮，和全域焦點環對不上） |
| `@media (prefers-reduced-motion: reduce)` 關閉動畫／過渡 | 不用管，照常寫 transition |
| `img, svg, video, canvas { max-width: 100% }` | 不用重複寫 |
| `img { height: auto }` | `<img>` 的 `width`/`height` 屬性同時是 CSS 的 presentational hint，只要有一邊被覆寫、另一邊就會卡在原值而把圖拉扁。這條是那兩個屬性的標配對句。元件要固定高度就自己覆寫（特異度自然勝過裸 `img`） |

- **`100vh` 一律配 `100dvh`**：`height: 100vh; height: 100dvh;`（前者是舊瀏覽器 fallback）。行動瀏覽器的 `100vh` 含會伸縮的網址列，會把底部的輸入框／footer 裁掉。

### 4-2. i18n（繁中＝原文，英文＝翻譯檔）

**繁中是原文、留在字串出現的地方；英文放 `src/i18n/en.json`。** 不可把繁中抽進 `zh.json`——那會讓 HTML 變空殼、破壞無 JS 基準，也破壞「`data-i18n="key">文字</` → `{t("key")}`」的 React 轉換契約。

- 可見文字：`<span data-i18n="qa.records">問答紀錄</span>`
- 屬性：`data-i18n-<目標屬性>`（`-title` / `-aria-label` / `-placeholder` / `-alt` / `-data-toast`）——後綴永遠等於它要翻譯的那個屬性名，零例外
- **由元件 js 讀 `data-*` 資料槽再畫出來的文字**不在上表的自動翻譯範圍，繁中原文與 i18n key 要分別給：單一值用 `data-<槽名>` + `data-<槽名>-key`（`ui/multi-select` 的 placeholder）；兩態切換用 `data-text-<態>` + `data-key-<態>`（`components/prompt-edit` 的展開↔收合）。元件 js 拿 key 走 `GufoI18n.t(key, 繁中原文)`（見 §5）
- 分頁標題：front matter 的 `titleKey`（見 §3-1）→ `base.html` 輸出成 `<html data-page-title-key>`，切語言時 `lang-toggle.js` 靠它重譯 `<title>`
- **同一個 key 的繁中原文必須一致**：切回繁中時的預設值是**從 DOM 就地擷取、以 key 為索引**，同 key 不同繁中會互相覆蓋。頁名與既有 key 的繁中相同才沿用，不同就另立 key
- **只翻 UI chrome，不翻假資料**：聊天訊息、提示詞、免責聲明內文、示範檔名／資料集名、表格 cell 值、示範 Excel 欄位一律不翻。**showcase／說明性質的整頁**（內容是寫給切版者看的，不是 app chrome）整頁不翻
- **翻譯字串不內嵌會隨資料變動的數字/名稱**：chrome 拆成前後綴 key、變動值放獨立節點或資料槽（正典：`pagination.totalPrefix`／`totalSuffix` 夾著 js 填數的 `.page-info-count`）
- **標點（冒號等）折進它所標示的翻譯 key，不要留成 span 外的字面量**：`<span data-i18n>門檻</span>：值` 在英文模式會露出全形 `：`；改成 `<span data-i18n>門檻：</span>值`、key 值含對應標點（如 `"Threshold: "`）。例外：同一 key 也用在無標點情境（表頭、表單 label）時不折——那裡的標點屬於版面而非 label，且折了會污染那些用途
- **英譯要保留原文之間的區別**：繁中原文不同的 key，英文譯文也要區別得開——會在同一畫面並列的欄位標題尤其（「成員」／「成員數」→ `Members`／`Member count`）
- 新增 key 就要在 `en.json` 補英文。**漏了不會壞，只會在英文模式默默顯示繁中**——所以驗收一定要 runtime 逐頁看（見 §8）
- `en.json` 的 key **依字母序插入**；每個 key 都要有 markup 引用（加了翻譯就要接上對應的 `data-i18n*`，反之亦然——有測試把關孤兒 key）

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
- 只操作**自己元件**的 class；要操作別的元件，呼叫該元件 js 提供的函式（例：`faq-chatroom.js` 的讚/倒讚要先預選再開窗，故呼叫 `faq-feedback-modal.js` 匯出的 `openFeedback(vote)`；`chatroom.js` 的「查看來源」呼叫 `sources-block.js` 匯出的 `GufoSources.show()`，而不是自己去 `removeClass`）
- **元件 js 查詢的每個 class 選擇器，在 `src/` 的生產 markup 都要打得到至少一個元素**（有測試把關）。頁面改版讓選擇器全數落空時，該支行為 js 連同三方登記一併撤下
- 會去 DOM 找元素的，包在 `DOMContentLoaded` 裡綁定（載入時不碰 DOM 的純函式工具如 `ui/scroll-lock` 不必）；同元件可能出現多次時用 `querySelectorAll().forEach()`
- **開合的高度動畫走 `ui/slide-toggle`**（`window.GufoSlide.down/up/toggle/set`，300ms，對應真 app 的 jQuery `slideDown/slideUp(300)`）。不要各自寫一份高度動畫，也不要退化成 `display` 一次切掉——那是「啪」一下，跟真 app 手感不同。它自己會處理重入（等同 `.stop(true,true)`）與 `prefers-reduced-motion`
- **一個全域資源只能有一個擁有者，而最好的擁有者是 DOM 自己。** body 捲動鎖是純 CSS：`html:has(dialog.modals[open]), html:has(.nav-toggle.active) { overflow: hidden }`（`_base.scss`）。**js 不得自己去鎖**（有測試把關）——跳窗與手機選單各鎖各的話，先關的那個會把還開著的那個一起解鎖；用計數器可以修，但 `:has()` 是宣告式的 OR，狀態就在 DOM 上，連失衡的可能都沒有。CSS 做不到的只有「捲軸有多寬」（鎖起來時它就不見了，量不到），由 `ui/scroll-lock` 寫進 `--scrollbar-width` 供那條規則補 padding
- **用 CSS 斷點決定顯示與否的東西，它的 js 不要複寫那個斷點值**：問 CSS 就好（`getComputedStyle(navToggle).display === "none"`）。斷點只有 mixin 那一份真相
- **視窗尺寸變化會讓「唯一關得掉它的那顆鈕」消失**：手機選單開著時拉寬過收合斷點，漢堡被 CSS 藏起來，遮罩與 body 鎖卻留著 → 只能重整。凡是「只在某斷點內才有觸發器」的開合，都要在 `resize` 時自我收合
- **`showModal()` 的 `<dialog>` 在瀏覽器的 top layer**：頁面層的 `position: fixed` 不管 z-index 開多大都蓋不過它。要蓋過它，自己也得進 top layer —— `#toastContainer` 掛 `popover="manual"`，`ui/toast` 每次彈 toast 前重新 `showPopover()` 一次（top layer 的疊放順序＝進入順序，先進去的反而在下面）。popover 不搶焦點，且 toast 不會隨著跳窗關閉一起消失
- **markup 零 inline 事件處理器**（`onclick=`／`onClick=`…）與零 `javascript:` href（`javascript:void(0)` 更是一顆死連結）：行為住在元件 js 裡。要「在 markup 宣告一個行為」時，掛**資料屬性**、由 owning 元件的 js 做事件委派——**無條件**開跳窗用 `data-open-modal="<dialog id>"`（`ui/modals`），彈提示用 `data-toast`（＋選填 `data-toast-type`，`ui/toast`），列印本頁用 `data-print`（`ui/print`）。委派掛在 `document` 上，動態插入的元素也吃得到
- **`document` 級委派的「點外部」判斷用 `event.composedPath()`**，不用 `event.target` 的存在性／`contains()`——同頁別的 document 委派可能先跑並用 `innerHTML` 重繪把 target 拔出文件，composedPath 在 dispatch 當下就固定、不受後續 DOM 突變影響
  - **切版是原型：每個動作的每一種結果都要演得出來。** 送 API 的按鈕（儲存 / 刪除 / 上傳 / 套用 / 查詢 / 下載）在 `data-toast` 裡用 `|` 列出它**所有**可能的結果，`data-toast-type` 用同樣順序對位；每點一次換下一個。設計師才看得到成功、失敗、警告長什麼樣，React 端也才知道這顆鈕要接哪幾種 toast
    - 例：`data-toast="帳號資訊已儲存|儲存失敗" data-toast-type="success|error"`。翻譯照舊掛 `data-i18n-data-toast`，`en.json` 的值同樣用 `|` 分隔
    - 這不是「說謊」——說謊的是**只演成功那一種**（`data-open-modal` 掛在有條件開窗的鈕上就是這種）。列出全部結果才是誠實的原型
  - `data-toast-type` 只准 `success` / `error` / `warning` / `info`（有測試把關）。打錯字不會噴錯，只會彈出一個沒有語意的白盒子
  - **有條件的開窗是業務邏輯，不掛 `data-open-modal`**（先設定要刪哪一列的名字、依模型權限決定開哪一份、驗證失敗才跳…）。那種觸發鈕保留真 app 的 hook class（`.js-apply-production`、`.btn-delete-file`…），切版不假裝它會無條件開窗——掛上去等於在 markup 裡寫了一句謊話。判準不必查表：**hook class 就是「全站 scss 找不到它」的 class**，開窗鈕身上有這種 class 就代表它另有 js 主人（有測試把關）
  - **條件開窗只免除 `data-open-modal`，不免除彈窗本體。** 觸發鈕會開的那個彈窗要建成切版元件、include 在使用頁，並在元件庫展示頁補 `data-open-modal` demo 觸發器（§1-2 第三條路）——彈窗長什麼樣是切版的視覺決策，不外包給 React（例：`apply-settings-modal`、`delete-modal`）。純重用既有已切彈窗、零新欄位版面時才免建本體，但 include 照樣要有：彈窗本體要 include 在**每一個**出現該觸發鈕的正式頁面（觸發鈕隨元件走到哪頁，彈窗就跟到哪頁）；元件庫展示頁上的那份只是第三條路的可視化，不能替正式頁面供本體
  - **hook class 只給業務行為**（要送 API、或要業務資料才能決定結果的動作）。純前端互動——同頁的顯示/隱藏、開合、複製、切換——沒有業務主人，是切版自己的行為：照本節寫成元件 js，當場就要動得起來
  - **不開任何窗的送 API 鈕，不適用條件開窗豁免**：顯示條件已由模板 `{% if %}` 處理、動作本身無需輸入的直接動作鈕（每列的儲存/撤銷…），照「送 API 的按鈕」規則掛 `data-toast` 列全結果
  - **每個分支結果都要看得到**：元件的空狀態（`{% for %}{% else %}`）等分支，至少一處（真實頁或元件庫展示頁）要用會觸發它的資料示範——沒有頁面演得出來的分支等於沒驗收過（同 `<dialog>` 可達性的精神）
- **一個 `<dialog id>` 只能由一個元件宣告。** 兩個元件各寫一份同 id 的彈窗＝兩份會分岔的正本，而且元件庫的示範觸發器只打得開其中一份、另一份變成誰都看不到的死彈窗。真 app 兩個頁面各有一份同 id 的不同彈窗時，**切版要改名**——`id` 不是轉換契約（React 不靠 `getElementById`），真正要原樣保留的是 hook class 與資料屬性
- 跳窗用 `<dialog>` 元素 + `showModal()` / `close()`（標準 API，與既有切版相同）。**進出場動畫寫在 CSS**：`@starting-style` 給進場起點、`transition: display .3s allow-discrete, overlay .3s allow-discrete` 讓瀏覽器撐到退場跑完才 `display:none`。**不要用 setTimeout 延後 `close()`** —— 那顆 timer 會逼你再寫「關到一半又點關閉」「關到一半又重開」兩道重入守衛，而 transition 原生就會反向
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

**真實 app 的業務 js 掛點要原樣保留，那是轉換契約、不是死碼。** hook class（`.js-apply-production`、`.btn-delete-file`、`.copyBtn`…）與資料屬性（`data-index`、`data-type`…）在切版裡沒有對應行為、也沒有樣式——但 React 端要靠它們認出「這顆按鈕該接什麼」。找死碼時**先去讀真 app**（見 README 的出處），確認它在那邊也沒人用，才是真的死碼。

**切版刻意不沿用真 app 某段行為時**（設計演進取代了它），在該頁檔頭註解記載「什麼取代了什麼」，並把因此失去掛點的元件 js 連同三方登記一併移除。

**切版新頁（真 app 無對應）的業務觸發鈕自創 hook class，命名 `js-<動詞>-<名詞>`**（`.js-reset-password`、`.js-manage-tenant`、`.js-revoke-token`…）——語意同上：標記「這顆鈕由 React 業務 js 接手」，全站 scss 不得引用它。多步驟流程的一組鈕允許 `js-<流程名>-<動作>`（`.js-review-confirm`、`.js-review-cancel`）當命名空間。

---

## 6. 元件的資料契約

- **元件不得寫死「會因使用它的頁面而異」的資料。** 這類資料由頁面在 include 前 `{% set %}` 提供（依 §3-2「重複資料放頁面」），元件只負責 `{% for %}` 渲染——轉 React 即 props。
- 兩種資料**可以**住在元件裡：(a) **全站不變的結構性設定**（如 header 的導覽選單）；(b) **純示範用的假資料**（同 §3-2：示範內容直接寫在元件當樣式示範）。一旦某頁需要不同的值，就由該頁 `set` 覆寫。
- **示範資料要演得到元件的核心互動**：傳給元件的 demo 值比照既有頁挑（如分頁的 `total` 要大到讓省略號出現）——落在「全顯示」分支的小數字示範不到滑動視窗，等於沒展示。
- **示範資料要自洽**：同頁與跨頁能互相推導的值（群組能力的聯集、總數與明細、狀態與徽章）要對得上——示範資料演的必須是一個真實可能的狀態。
- 同頁重複使用同一元件時，**每次 include 前重新 set 全部參數**（§2：`set` 是全域的，上一次的值會留著）。
- **元件內部的示範資料 `{% set %}` 變數，用元件專屬名、不用泛用名**（`manageMemberRows` 而非 `members`）：`set` 是頁面全域，被 include 時泛用名會和使用頁自己的同名變數互相覆蓋（§2），且沒有測試抓得到這種靜默覆蓋。
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
| `<dialog>` + `showModal()` | React 可沿用 dialog，或換 Dialog 元件。**進出場動畫在 CSS**（`@starting-style` + `display`/`overlay` 的 `allow-discrete`），沒有計時器可搬；**捲動鎖也在 CSS**（`html:has(dialog.modals[open])`），不要在 React 裡重寫一份 |
| 所有 modal 的外殼（`.modals` > `.modals-dialog.modals-<尺寸>` > `.modals-wrap` > `ui/modal-close` + `.modals-content`） | 除了 `.modals-dialog` 的尺寸 class 之外逐字元相同 → 收成一個 `<Modal size>{children}</Modal>`，各 modal 只剩自己的 header/body/footer（實際有幾個 modal、各是什麼尺寸屬現況，見 README） |
| `data-open-modal="X"` / `data-toast="…"`（事件委派） | `onClick={() => open("X")}` / `onClick={() => toast("…")}`；資料屬性只是切版期沒有 props 時的替身 |
| `<a data-i18n="key">文字</a>` | `{t("key")}`（next-intl 等）；`src/i18n/en.json` 直接當英文 message catalog，繁中原文由 markup 抽出成 zh catalog |
| `GufoI18n.t(key, "繁中")` / `gufo:langchange` / `lang-toggle.js` | **不帶過去**：runtime 就地切換是切版專用；React 用 i18n library 的 `t()` 與語言 context |
| `ui/multi-select`（增強原生 `<select multiple>`） | `react-select`（isMulti）；value 陣列＝原生 select 的選取，行為（標籤／搜尋／複選）即規格 |
| `_var.scss` 顏色變數 | 全域引入一次，元件照用 `var(--...)` |

accordion 的行為規格（`ui/accordion/accordion.js`）：各列**獨立開合**（點哪列就 toggle 哪列，不會自動關其他列），掃描根為 accordion 自有的 `.js-accordion`（原子，不綁定任何 `components/` 的 class）。轉 React 時由各 accordion 元件自管開合狀態（`useState` 記住開啟的列），不要跨元件共用一份全域狀態。

單色圖示（`icon-mask()`）的行為規格：**alpha 是字形、顏色是語意 token**。轉 React 時直接改成內嵌 SVG component + `fill="currentColor"` —— 那正是遮罩在模擬的東西。`_dark-icons.scss` 的 `img[src*="_black"]` 反相規則屆時可整條刪掉。

HTML → JSX 為機械式替換：`class`→`className`、標籤自閉合、`{# #}`→`{/* */}`。
CSS 不需任何翻譯：交付的樣式即正式環境的最終樣式。

> 預設走「scss 原樣複製」如上。**若 React 團隊改選 Tailwind**，本專案的 token/尺標/utility 層已刻意做成好轉——轉換配方（theme 映射、max-width 斷點、哪些逃生口須保留成 CSS）見 [`TAILWIND-CONVERSION.md`](TAILWIND-CONVERSION.md)。

---

## 8. 交付前檢查清單

- [ ] `npm run check` 綠（stylelint → build → test，測試把本規範的規則跑成斷言）；`dist/` 每一頁雙擊可開、外觀與互動正確
- [ ] 零死碼：每個元件 html 都被 include、每張 `src/images` 的圖都被引用；build 產出的資產都帶 content hash（`?v=`）
- [ ] 沒有 jQuery 與任何第三方 JS 套件；js 只用標準 DOM API
- [ ] 每個有互動的元件：js 在自己資料夾，且已在 `eleventy.config.js` 與 `base.html` 登記
- [ ] 重複區塊都是 include；重複列／選項用 `{% for %}` + front matter 資料
- [ ] class 命名沿用既有系統；新顏色定義在 `_var.scss`（light + dark 都要給）
- [ ] 放對桶：整頁模板 → `layouts/`；會用到其他元件 → `components/`；零依賴 → `ui/`
- [ ] 只用了 §2 白名單內的模板語法；註解一律 `{# #}`，零 `<!-- -->`
- [ ] 沒有行內 style 的間距/顏色/字級（只允許 §4 的三種合法用途）；間距都在尺標上
- [ ] HTML 巢狀合法（span 內無 div/p/ul）；圖示按鈕有可及名稱；label 有 for/id 或控制項有 aria-label；無空屬性；同頁 id 不重複
- [ ] 每頁恰好一個 `<h1>`；沒有 `div[role=button]`；可開合控制項的 `aria-expanded` **每一條路徑**都同步；`<dialog>` 有 `aria-labelledby`
- [ ] 沒有裸 `outline: none`；元件沒有重寫 `box-sizing`；`100vh` 都配了 `100dvh`；`<img>` 都有 `width`/`height`
- [ ] 新顏色算過對比：白字 on 填充 ≥ 4.5:1、填充 on 底色 ≥ 3:1；新 token 在測試裡歸了角色
- [ ] 新 key 都補了 `en.json`；**英文模式下逐頁 runtime 驗過，而且要實際觸發互動**（展開 accordion、開多選下拉、切主題）——JS 產生的字串靜態掃描看不到
- [ ] 新增/改寫元件行為 js：邊界輸入（0、1、缺值、貼邊）逐一驗過，並把斷言寫進 `tests/guideline.test.mjs` 或等效可重跑腳本——一次性手動探索不算驗收，下一輪重跑不到就等於沒測過
- [ ] 條件開窗鈕的彈窗本體在**每一個**使用頁都 include 了；元件 js 的 class 選擇器都打得到元素；示範資料自洽（聯集/總數對得上）

---

## 9. Dos & Don'ts

```html
<!-- ❌ 每頁貼一份 header（每頁都要跟著改） -->
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
.some-inner-input { outline: none; }

/* ✅ 要嘛不寫；複合元件把內層的環拿掉、改畫在外框上（見 ui/multi-select） */
.multi-select-search { outline: none; } // 焦點環改畫在外框
// :has() 一定要指名「那顆被藏起來的控制項」——寫成 :has(:focus-visible) 的話，
// 控制項裡任何可聚焦的東西（tag 的移除鈕）都會點亮外框，和它自己的焦點環疊在一起。
.multi-select-control:has(.multi-select-search:focus-visible) { outline: 2px solid var(--brand-text); outline-offset: 2px; }
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
