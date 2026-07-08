# 切版規範（規格書）

本文件是這個專案的**規範**：定義檔案結構、語法白名單、各層級的規則，以及與 React 的對應關係。
適用對象：維護本專案的人與協作的 AI，以及將本專案轉換成 React 的人與 AI。
本專案 `gufofaq-frontend-11ty` 是 GufoFAQ 前端切版的**唯一正本**：源自原 `GufoFAQ_Frontend_New`（HTML+jQuery 切版）依本規範轉成的 11ty 版本，原專案只是歷史出處，不再是需要逐字對齊的真相來源。標準實作見 `src/pages/**` 全 23 頁（如 `src/pages/qaHistory/4-2_qaHistory_detail.html`、`src/pages/dataImport/1-1-4_columnSelect_excel.html`）與 `src/_includes/{ui,components}/` 元件庫；**元件總覽頁**見 `src/pages/components/component.html`（build 後開 `dist/component.html`，一頁看完所有元件）。
執行方式見 [README.md](README.md)。

> 註：本專案頁面原始碼放在 `src/pages/<section>/` 保持分類，但 front matter 的 `permalink` 一律輸出**扁平檔名**到 `dist/` 根，確保每頁的 `./css`、`./js`、`../images` 路徑一致。§1 檔案結構圖示以方法為準；本專案 scss 另含 `_normalize`（reset）、`_guideline`（元件總覽頁樣式）兩個從真 app 補入的檔。（真 app 的第二支樣式表 css/style.css 已依 §4 解散歸戶成 `filter-fields`／`prompt-card`／`ab-test-block` 三個純樣式元件，不再單獨存在。）

核心原則（工作約定）：

1. **共同語言**：class 命名沿用既有設計系統的詞彙（`.header`、`.modals`、`.form-group`…），新元件跟隨同樣風格——命名是共同語言，不另立一套。
2. **規範優先於歷史**：寫法標準以本 GUIDELINE 為準（§2 語法白名單、§4 HTML/CSS、§5 JS）。不以「與原始切版逐字一致」為目標；動到舊程式碼時發現違反規範的寫法，就地修正——檔頭可註記出處，但「逐字照抄」不是豁免理由。
3. **元件只有一份正本**：檔案組織照 §1（一個元件一個資料夾，html + scss + js 同住）；要用就 include，要改就改它資料夾裡那一份。
4. **維持可轉換**：架構保持 React-friendly——include＝元件、set＝props、front matter + `{% for %}`＝資料渲染（§7 是轉換對照契約）；行為一律原生 JS（§5），不引入第三方前端套件。

---

## 1. 檔案結構

```
gufofaq-frontend-11ty/
├── src/
│   ├── _includes/
│   │   ├── layouts/                   ← 整頁模板（只放模板，不放元件）
│   │   │   ├── base.html              ←   <head> + 全頁框架 + script 清單
│   │   │   └── page-shell.html        ←   一般頁外殼：header + main 容器 + footer
│   │   │                                  （骨架樣式在 scss/ 的 _base/_style，layouts/ 只放模板）
│   │   ├── components/                ← 大元件：會用到其他元件的組合區塊
│   │   │   └── <元件名>/              ←   一個元件 = 一個資料夾
│   │   │       ├── <元件名>.html      ←     元件 HTML（唯一正本）
│   │   │       ├── _<元件名>.scss     ←     元件樣式（有才放）
│   │   │       └── <元件名>.js        ←     元件行為（有才放）
│   │   └── ui/                        ← 小元件：不依賴其他元件的積木
│   ├── scss/
│   │   ├── _var.scss                  ←   顏色變數（全站唯一的顏色定義處）
│   │   ├── _mixin.scss                ←   scrollbar 等共用 mixin
│   │   ├── _base.scss                 ←   html/body/標籤預設
│   │   ├── _utilities.scss            ←   text-*、flex-row、gap-*、col-*、mt-*/mb-*/my-* 等工具 class
│   │   └── main.scss                  ←   只放 @use 組裝清單
│   ├── images/
│   ├── index.html                     ← 登入頁（permalink 輸出成 login.html）
│   ├── catalog.html                   ← 部署站台首頁＝頁面目錄（permalink 輸出成 index.html；showcase 入口，性質同 component.html，非 app 一部分）
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
- 每個元件的 scss 只寫自己的 class；**A 元件的 scss 禁止出現 B 元件的 class**（無例外：外觀覆寫改成 owning 元件的 variant class，如 `link-modal.on-dark`、`list-style-disc.line-loose`；容器排版子元件改用 parent 自有的 slot class，如 `.select-submit`、`.chat-input-control`、`.filter-field`、`.ab-side`）
- 禁止依頁面覆寫元件（`.page-xxx .button {...}`）；頁面專屬的一次性樣式也要歸戶成**純樣式元件**（無 html/js 只有 scss，如 `ab-test-block`），不放全域樣式表
- **間距一律用工具 class**：水平間距交給 `flex-row` 的 `gap-*`；垂直（區塊與區塊之間）用 `mt-*`／`mb-*`／`my-*`（尺標同 gap：4, 8, 10, 12, 16, 20, 24, 32, 40），歸零用 `m-0`。**不要寫行內 `style="margin-..."`**；間距值不在尺標上時優先靠齊尺標（±2px 屬可接受誤差），真的必須保留才允許行內 style 並註記原因
- 行內 style 的合法用途只有三種：表格欄寬（`<col style="width:...">`）、資料驅動的值（如 storage-bar 的 `width: 84.3%`，轉 React 即 `style={{width}}`）、由 JS 切換顯示的初始 `display: none`。**不可**用行內 style 寫顏色、字級與間距
- 工具 class 是「最後一手」的覆寫層：間距（`mt/mb/my/m-0`）、顯示（`hidden`）、對齊（`text-left/center/right`）帶 `!important`（等同其所取代的行內 style 的優先權），元件樣式不可依賴蓋過它們；文字大小/顏色工具不帶 `!important`（允許元件情境覆寫）
- 欄位系統：`.col-N-*` 欄寬以 calc() 自動扣除該列 gap 分攤，同列 span 總和 = 12 時恰好填滿一行（搭配 `.flex-wrap` 不會提早掉行）；直向排列（`.column`／斷點下的 `.mobile-column(-xs)`）時不扣，`.col-12-*` 恆為整寬。用法見元件總覽頁 §04
- **HTML 巢狀必須合法**：行內元素（`span`、`a`…）內不可放區塊元素（`div`、`p`、`ul`…）——瀏覽器會容錯，但轉 React 時 SSR/hydration 會報錯。長文/富文字容器（如 chatroom 的 `.robot-msg`）一律用 `div`
- **可及性（a11y）基本要求**：圖示按鈕要有可及名稱（`title` + `.sr-only`、`aria-label`，或按鈕內的 `.tooltip` 文字）；label 與表單控制項以 `for`/`id` 關聯（同一元件在頁面重複出現時，id 用迴圈變數組唯一值，見 `ui/form-control` 示範），沒有可見 label 的控制項（如聊天輸入框）加 `aria-label`；不輸出空屬性（`for=""`、`name=""`、`id=""`）；裝飾性圖片 `alt=""`、有語意的圖片給有意義的 alt

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
| `ui/breadcrumb` | 頁面 include 前 `{% set breadcrumbItems = [{ label, href }] %}`；**最後一項＝目前頁（純文字），其餘皆為連結**；`href` 省略時輸出空 href。 |
| `ui/pagination` | 頁面 set `pages`（`[{ number, active }]`，可含 `{ ellipsis: true }`）；渲染 `.pagination` 頁碼列。可輸入頁碼版 `.pagination-input` 為另一互動變體（`pagination.js` 增強），markup 就地寫（示範見 component.html、實用於 4-2）。 |
| `components/step-nodes` | 頁面 set `steps = [{ label, done }]` + 選填 `stepNodesLg`（true 加 `.lg` 大尺寸）；`.done` = 已完成。 |
| `components/step-btn-wrap` | 頁面 set `steps` + 選填 `stepNoPrev`（true＝只留下一步、外層加 `.no-prev`）/ `stepNodesLg`；上一步／下一步為 `.btn-prev`／`.btn-next` JS 鉤子；中間進度條 include `components/step-nodes`。 |
| `components/multi-select-box` | 頁面 set `fields = [{ key, label, placeholder, options:[{ value, label, selected }], preview, error? }]`；`key` 用來組 `.field-{key}`／`.preview-{key}`；左欄 `<select class="multiSelect">` 由 `ui/multi-select` 增強成 tag 多選。 |
| `components/sources-block` | 頁面 set `sources = [{ no, file, dataset, title, time, content, note1, note2, reference }]`；每筆列（摘要列＋隱藏的 accordion 詳細列）以 `{% for %}` **內嵌**渲染（見 §9 陷阱：元件內部的 for 不可再巢狀 include 子元件）。外層 `.sources-block` 為設計師原有的語意 class（本身不帶樣式，視覺來自 `.block` + default-table），刻意保留；同層另掛 accordion 的 `.js-accordion` 開合鉤子。 |
| `components/qa-detail-info` | 頁面 set `conversation = { chatroomId, id, time, intent, userMessage, satisfaction, feedback }`（短欄位）；AI 回答與「提示詞」收合欄（`.collapse-text`，其展開屬業務 JS 不在範圍）為長文，依 §3-2 直接寫在元件 markup。 |
| `components/qa-record-tabs` | 頁面 set `qaRecordTabs = [{ label, active }]`；單測/AB測試/前台對話預覽三頁共用的 `.tab-group` 頁籤清單。外層 `.tab-wrap` 等 chrome 各頁自帶。 |
| `components/prompt-edit` | 單測/AB測試頁的「提示詞」收合編輯區；`promptDefaultOpen`（true 時加 `data-default-open`）。展開/收合（切換 `.open`、注入編輯 textarea）由 `prompt-edit.js` 提供；實際儲存/建版本 API 屬業務邏輯不在範圍。 |
| `components/qa-side-panel` | 單測/AB測試頁的可收合問答紀錄側欄（toggle + 開啟新對話 + 頁籤）；`sidePanelHidden`（true 加 `.hidden`）。展開/收合（切換 `.collapsed`）由 `qa-side-panel.js` 提供。內含 `qa-record-tabs`（其 `qaRecordTabs` 由頁面提供）。 |

> 說明：上列資料型元件的資料一律由**使用它的頁面**在 include 前 `{% set %}` 提供（依 §3-2「重複資料放頁面」），元件本身**不自帶資料**、只負責 `{% for %}` 渲染——與範例方法一致，轉 React 即 props。（元件總覽頁 `component.html` 也是以 `{% set %}` 供這些元件示範資料，不由元件自帶。）

### 自動引入

`header`（內含 mobile-nav）、`footer`（內含 disclaimer-modal）由 `page-shell` 提供，頁面不需 include。
含子元件的元件：`header`（含 `mobile-nav`）、`footer`（含 `disclaimer-modal`）、`default-table`（含 `accordion`）、`step-btn-wrap`（含 `step-nodes`）、`qa-side-panel`（含 `qa-record-tabs`）。

### 純樣式 / 純行為元件（直接寫 class）

`button`、`block`、`default-table`、`form-group`、`form-table`、`link-file`、`modals`、`accordion`、`multi-select`、`login-wrapper`（無 html，class 直接寫在 `src/index.html`）。
另有三個由原 css/style.css 解散歸戶的純樣式元件（無 html，class 直接寫在使用頁）：`filter-fields`（篩選列，欄位加 slot class `.filter-field`，用於 5-4-1、2-2-1）、`prompt-card`（5-4-1 版本卡，草稿卡 textarea 加 slot class `.prompt-input`）、`ab-test-block`（2-2-3 設定區，兩側容器加 `.ab-side`、欄位標籤加 `.ab-field-label`）。
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

accordion 的行為規格（`ui/accordion/accordion.js`）：各列**獨立開合**（點哪列就 toggle 哪列，不會自動關其他列），掃描根為 accordion 自有的 `.js-accordion`（原子，不綁定任何 `components/` 的 class）。轉 React 時由各 accordion 元件自管開合狀態（`useState` 記住開啟的列），不要跨元件共用一份全域狀態。

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
- [ ] 沒有行內 style 的間距/顏色/字級（只允許 §4 的三種合法用途）；間距都在尺標上
- [ ] HTML 巢狀合法（span 內無 div/p/ul）；圖示按鈕有可及名稱；label 有 for/id 或控制項有 aria-label；無空屬性

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
/* ❌ 在 A 元件的 scss 裡改 B 元件 */
.sources-block .button { padding: 0; }

/* ✅ 各自的樣式寫在各自的檔案 */
```
