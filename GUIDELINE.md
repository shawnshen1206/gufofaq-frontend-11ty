# 切版規範（規格書）

本文件是這個專案的**規範**：定義檔案結構、語法白名單、各層級的規則，以及與 React 的對應關係。
適用對象：產生或修改本專案程式碼的人與 AI，以及將本專案轉換成 React 的人與 AI。
本專案 `gufofaq-frontend-11ty` 是 **GufoFAQ 前端（原 `GufoFAQ_Frontend_New` 的 HTML+jQuery 切版）依本規範轉成的 11ty 版本**，作為設計師後續協作切版的 base。標準實作見 `src/pages/**` 全 23 頁（如 `src/pages/qaHistory/4-2_qaHistory_detail.html`、`src/pages/dataImport/1-1-4_columnSelect_excel.html`）與 `src/_includes/{ui,components}/` 元件庫；**元件總覽頁**見 `src/pages/components/component.html`（build 後開 `dist/component.html`，一頁看完所有元件）。
執行方式見 [README.md](README.md)。

> 註：本專案頁面原始碼放在 `src/pages/<section>/` 保持分類，但 front matter 的 `permalink` 一律輸出**扁平檔名**到 `dist/` 根，確保每頁的 `./css`、`./js`、`../images` 路徑一致。§1 檔案結構圖示以方法為準；本專案 scss 另含 `_normalize`（reset）、`_style`（第二份樣式表）、`_guideline`（元件總覽頁樣式）三個從真 app 補入的檔。

核心原則：**沿用設計團隊既有的 class 命名、markup 結構與 SCSS 寫法**（與上層資料夾的原始切版一致）。
本範本相對於原始切版只改三件事：

1. 檔案組織：每個元件一個資料夾（html + scss + js 同住）
2. jQuery 改為元件自己的 vanilla JS（標準 DOM API）
3. 頁面用 include 組合、重複內容寫成 front matter 資料

---

## 1. 檔案結構

```
gufofaq-frontend-11ty/
├── src/
│   ├── _includes/
│   │   ├── layouts/                   ← 整頁模板（只放模板，不放元件）
│   │   │   ├── base.html              ←   <head> + 全頁框架 + script 清單
│   │   │   ├── page-shell.html        ←   一般頁外殼：header + main 容器 + footer
│   │   │   └── _layout.scss           ←   骨架樣式（.full-wrap、.wrap、.main、.page-title）
│   │   ├── components/                ← 大元件：會用到其他元件的組合區塊
│   │   │   └── <元件名>/              ←   一個元件 = 一個資料夾
│   │   │       ├── <元件名>.html      ←     元件 HTML（唯一正本）
│   │   │       ├── _<元件名>.scss     ←     元件樣式（有才放）
│   │   │       └── <元件名>.js        ←     元件行為（有才放）
│   │   └── ui/                        ← 小元件：不依賴其他元件的積木
│   ├── scss/
│   │   ├── _var.scss                  ←   顏色變數（與原始切版的 _var.scss 相同）
│   │   ├── _mixin.scss                ←   scrollbar 等 mixin（與原始切版相同）
│   │   ├── _base.scss                 ←   html/body/標籤預設
│   │   ├── _utilities.scss            ←   text-*、flex-row、gap-*、col-* 等工具 class
│   │   └── main.scss                  ←   只放 @use 組裝清單
│   ├── images/
│   ├── index.html                     ← 登入頁（src/ 根，與 pages/ 同層）
│   └── pages/<section>/<頁面>.html     ← 頁面 = 選 layout + 元件組合（permalink 輸出扁平檔名到 dist/ 根）
└── dist/                              ← build 輸出（不可手動編輯）
```

### 1-1. 放置規則（三個桶）

| 桶 | 判斷句 | 例 |
|---|---|---|
| `layouts/` | 是整頁的**模板**嗎？ | base、page-shell |
| `components/` | 它的 html / scss / js **會用到其他元件**，或是某大元件的**專屬子片段**嗎？（大） | header、sources-block、multi-select-box、mobile-nav |
| `ui/` | **不依賴任何其他元件**的最小單位？（小） | button、modals、pagination |

「專屬子片段」指由某個大元件 include、不會單獨使用的部分：`mobile-nav`（header 的手機版選單，共用 header 的 `menuItems`、行為依賴 `modals.js`）、`disclaimer-modal`（footer 的免責聲明跳窗，套用 `modals` 的樣式）。它們放在 `components/` 而非 `ui/`。

### 1-2. 元件檔案規則

- html / scss / js 三種檔案**有才放**：純樣式元件只有 scss（button）、純行為元件只有 js + scss（accordion）
- 有 scss → 在 `scss/main.scss` 對應分組加一行 `@use`
- 有 js → 在 `eleventy.config.js` 的 passthrough 清單和 `layouts/base.html` 的 script 清單各加一行
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
layout: layouts/page-shell.html        # 或 layouts/base.html
title: GufoFAQ::頁面標題
permalink: 檔名.html                   # 輸出到 dist/ 的檔名
# （頁面資料寫在這之後）
---
```

| layout | 自動提供 | 適用 |
|---|---|---|
| `layouts/page-shell.html` | `<head>` + header + main 容器 + footer + script 清單 | 一般頁面 |
| `layouts/base.html` | 只有 `<head>` + 空白外框 + script 清單 | 特殊版型（如登入頁） |

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
- SCSS 寫法沿用既有風格（巢狀、`&` 修飾）；顏色用 `_var.scss` 變數
- 每個元件的 scss 只寫自己的 class；**A 元件的 scss 禁止出現 B 元件的 class**
  - **既有跨元件規則的例外**：原始 `component.scss` 是單一大檔，少數規則本來就把別元件的 class 嵌在自己底下（如 `.footer .link-modal`、`.select-btn-wrap .button`、`.chat-input-container .form-group .form-control`）。拆成一元件一檔時，這些規則**逐字保留在原本負責它的元件檔內**（維持外觀 100% 還原優先於嚴格隔離），並在該 scss 檔開頭以註解標明「逐字複製自真實 app」。**只有這類「原 app 既有的跨元件規則」可保留；不得新寫任何新的跨元件覆寫。** 轉 React 時再把這類規則歸位到擁有該 class 的元件。
- 禁止依頁面覆寫元件（`.page-xxx .button {...}`）
- 間距優先用既有工具 class（`flex-row column gap-16` 等）；簡單的一次性間距與表格欄寬（`<col style="width:...">`）允許行內 style（與既有切版習慣一致），但**不可**用行內 style 寫顏色與字級

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

### 新增元件 js 的登記（各加一行）

1. `eleventy.config.js`：passthrough 清單加 `"src/_includes/桶/元件/元件.js": "js/元件.js"`
2. `layouts/base.html`：script 清單加 `<script defer src="./js/元件.js"></script>`

### tag 多選（`ui/multi-select`）

切版需要展示互動，所以 tag 式多選由本範本提供：在原生 `<select multiple class="multiSelect">` 上加 `ui/multi-select/multi-select.js`，增強成標籤（可 `×` 移除）＋下拉複選（不關閉）＋搜尋過濾＋placeholder。**原生 `<select>` 仍是唯一資料來源**——操作都寫回它的 `option.selected` 並觸發 `change`。轉 React 時對應 `react-select`（isMulti），value 陣列＝原生 select 的選取。

### 不在切版範圍的互動

日期選擇、表單驗證、資料載入：保留原生元素或靜態外觀，由 React 套件實作。

---

## 6. 元件使用一覽

### 帶資料的元件

| 元件 | 參數／資料 |
|---|---|
| `ui/breadcrumb` | include 前 `{% set breadcrumbItems = [{ label, href }] %}`；**最後一項＝目前頁（純文字），其餘皆為連結**；`href` 省略時輸出空 href（比照真實 app）。未提供時元件用 `{% if not %}` 帶示範資料。 |
| `ui/pagination` | 靜態展示，無參數（頁碼清單在正式環境由資料驅動渲染，非切版範圍；`.pagination-input` 輸入版由 `pagination.js` 增強）。 |
| `components/step-nodes` | 自帶 `{% set steps = [{ label, done }] %}`（`.done` = 已完成；`.lg` = 大尺寸變體）。 |
| `components/step-btn-wrap` | 靜態、無參數：上一步／下一步 `href="#"`，帶 `.btn-prev`／`.btn-next` JS 鉤子 class；只需下一步時最外層加 `.no-prev` 並移除上一步按鈕。 |
| `components/multi-select-box` | 自帶 `{% set fields = [{ key, label, placeholder, options:[{ value, label, selected }], preview, error? }] %}`；`key` 用來組 `.field-{key}`／`.preview-{key}`；左欄 `<select class="multiSelect">` 由 `ui/multi-select` 增強成 tag 多選。 |
| `components/sources-block` | 自帶 `{% set sources = [{ no, file, dataset, title, time, content, note1, note2, reference }] %}`；每筆用子元件 `source-row.html` 渲染。外層的 `.sources-block` 是設計師原有的語意／JS 鉤子 class，本身不帶樣式（視覺來自 `.block` + default-table），刻意保留。 |
| `components/qa-detail-info` | 自帶 `{% set conversation = { chatroomId, id, time, intent, userMessage, satisfaction, feedback } %}`；AI 回答與「提示詞」收合欄（`.collapse-text`，其展開屬業務 JS 不在範圍）為長文示範，依 §3-2 寫死在元件。 |
| `components/qa-record-tabs` | 單測/AB測試/前台對話預覽三頁共用的 `.tab-group` 頁籤清單；`qaRecordTabs`（`[{ label, active }]`，未給用預設）。外層 `.tab-wrap` 等 chrome 各頁自帶。 |
| `components/prompt-edit` | 單測/AB測試頁的「提示詞」收合編輯區；`promptDefaultOpen`（true 時加 `data-default-open`）。展開/儲存等屬業務 JS 不在範圍，`js-prompt-*` 為靜態 hook。 |

> 說明：除 `breadcrumb` 用 `{% if not %}` 允許頁面覆寫外，上列元件目前把示範資料以 `{% set %}` 寫死在元件內，讓每個元件都能 standalone include、在元件總覽頁直接呈現。轉 React 時把這些 `{% set %}` 資料抽成 props。

### 自動引入

`header`（內含 mobile-nav）、`footer`（內含 disclaimer-modal）由 `page-shell` 提供，頁面不需 include。
含子元件的元件：`sources-block`（含 `source-row`）、`header`（含 `mobile-nav`）、`footer`（含 `disclaimer-modal`）。

### 純樣式 / 純行為元件（直接寫 class）

`button`、`block`、`default-table`、`form-group`、`form-table`、`link-file`、`modals`、`accordion`、`multi-select`、`login-wrapper`（無 html，class 直接寫在 `src/index.html`）。
結構以 `src/pages/**` 與元件總覽頁為準（`multi-select` 無 html，靠 js 增強 `.multiSelect`）。

---

## 7. React 轉換對照

| 本專案 | React |
|---|---|
| `layouts/page-shell.html` | route layout（Next.js `layout.tsx`、React Router `<Outlet />` 外層） |
| `components/xxx/`、`ui/xxx/` | 一個 component 資料夾（`Xxx.tsx` + 同名 scss） |
| 元件的 `_xxx.scss` | **原樣複製**到元件旁 `import './xxx.scss'`，不改寫 |
| 元件的 `xxx.js` | 行為規格：改寫成該元件的 `useState` / 事件處理（DOM 操作 → state 驅動） |
| `{% include %}` | `<Xxx />` |
| `{% set xxx %}` | props |
| front matter 資料 + `{% for %}` | `data.map(item => <Row item={item} />)` |
| `.open`、`.active`、`.done`、`.error` 狀態 class | `useState` 布林 / props（`className={open ? "x open" : "x"}`） |
| `<dialog>` + `showModal()` | React 可沿用 dialog，或換 Dialog 元件 |
| `ui/multi-select`（增強原生 `<select multiple>`） | `react-select`（isMulti）；value 陣列＝原生 select 的選取，行為（標籤／搜尋／複選）即規格 |
| `_var.scss` 顏色變數 | 全域引入一次，元件照用 `var(--...)` |

accordion 的行為（`ui/accordion/accordion.js`）逐字沿用真實 app `main.js`：各列**獨立開合**（點哪列就 toggle 哪列，不會自動關其他列），並以 `.sources-block` 為掃描根範圍。轉 React 時由各 accordion 元件自管開合狀態（`useState` 記住開啟的列），不要跨元件共用一份全域狀態。

HTML → JSX 為機械式替換：`class`→`className`、標籤自閉合、`{# #}`→`{/* */}`。
CSS 不需任何翻譯：交付的樣式即正式環境的最終樣式。

---

## 8. 交付前檢查清單

- [ ] `npm run build` 成功；`dist/` 每一頁雙擊可開、外觀與互動正確
- [ ] 沒有 jQuery 與任何第三方 JS 套件；js 只用標準 DOM API
- [ ] 每個有互動的元件：js 在自己資料夾，且已在 `eleventy.config.js` 與 `base.html` 登記
- [ ] 重複區塊都是 include；重複列／選項用 `{% for %}` + front matter 資料
- [ ] class 命名沿用既有系統；新顏色定義在 `_var.scss`
- [ ] 放對桶：整頁模板 → `layouts/`；會用到其他元件 → `components/`；零依賴 → `ui/`
- [ ] 只用了 §2 白名單內的模板語法

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

<!-- ✅ 資料 + 迴圈，示意 3 筆 -->
{% for source in sources %}
{% include "components/sources-block/source-row.html" %}
{% endfor %}
```

```js
// ❌ jQuery，且所有頁面的行為擠在一支 main.js
$(".accordion-btn").on("click", function () { $(this).toggleClass("open"); });

// ✅ 標準 DOM API，寫在 ui/accordion/accordion.js
btn.addEventListener("click", function () { btn.classList.toggle("open"); });
```

```scss
/* ❌ 在 A 元件的 scss 裡改 B 元件 */
.sources-block .button { padding: 0; }

/* ✅ 各自的樣式寫在各自的檔案 */
```
