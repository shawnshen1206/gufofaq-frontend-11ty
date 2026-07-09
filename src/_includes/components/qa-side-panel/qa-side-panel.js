// 右側「問答紀錄」側欄：切換 .collapsed 讓面板滑進（展開）/滑出（收合）。
// 行為改寫自真實 app 的 js/main.js「右側問答紀錄面板 收合/展開」（原用 jQuery），改用標準 DOM API。
// 純視覺切換（不含載入問答資料等業務邏輯）：點直立的「問答紀錄」tab 展開/收合；點面板外部收合。
//
// a11y：toggle 的 aria-expanded 與 title 必須跟著實際狀態走（含「點外部收合」這條路徑）。
// i18n：展開↔收合的 title 由 JS 切換，故同步改寫 data-i18n-title 的 key，切換語言時才會依當下狀態重譯。
document.addEventListener("DOMContentLoaded", function () {
    var KEY_EXPAND = "comp.expandQaRecord";
    var KEY_COLLAPSE = "comp.collapseQaRecord";
    var ZH_EXPAND = "展開問答紀錄";
    var ZH_COLLAPSE = "收合問答紀錄";

    function t(key, zh) {
        return (window.GufoI18n && window.GufoI18n.t) ? window.GufoI18n.t(key, zh) : zh;
    }

    // 依面板當下的 .collapsed 狀態，寫齊 toggle 的 aria 與標籤
    function sync(panel) {
        var toggle = panel.querySelector(".js-side-toggle");
        if (!toggle) return;
        var expanded = !panel.classList.contains("collapsed");
        var key = expanded ? KEY_COLLAPSE : KEY_EXPAND;
        toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        toggle.setAttribute("title", expanded ? t(KEY_COLLAPSE, ZH_COLLAPSE) : t(KEY_EXPAND, ZH_EXPAND));
        toggle.setAttribute("data-i18n-title", key);
    }

    var panels = document.querySelectorAll(".qa-side-panel");
    panels.forEach(sync);

    document.querySelectorAll(".js-side-toggle").forEach(function (toggle) {
        toggle.addEventListener("click", function (e) {
            e.stopPropagation();
            var panel = toggle.closest(".qa-side-panel");
            if (!panel) return;
            panel.classList.toggle("collapsed");
            sync(panel);
        });
    });

    // 點面板外部：收合所有側欄
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".qa-side-panel")) {
            panels.forEach(function (panel) {
                panel.classList.add("collapsed");
                sync(panel);
            });
        }
    });

    // 切換語言後依「當下狀態」重畫 title
    document.addEventListener("gufo:langchange", function () {
        panels.forEach(sync);
    });
});
