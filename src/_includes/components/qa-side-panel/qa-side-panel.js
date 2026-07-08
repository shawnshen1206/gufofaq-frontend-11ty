// 右側「問答紀錄」側欄：切換 .collapsed 讓面板滑進（展開）/滑出（收合）。
// 行為改寫自真實 app 的 js/main.js「右側問答紀錄面板 收合/展開」（原用 jQuery），改用標準 DOM API。
// 純視覺切換（不含載入問答資料等業務邏輯）：點直立的「問答紀錄」tab 展開/收合；點面板外部收合。
document.addEventListener("DOMContentLoaded", function () {
    // 點 toggle：切換自己所屬側欄的 .collapsed
    document.querySelectorAll(".js-side-toggle").forEach(function (toggle) {
        toggle.addEventListener("click", function (e) {
            e.stopPropagation();
            var panel = toggle.closest(".qa-side-panel");
            if (panel) panel.classList.toggle("collapsed");
        });
    });

    // 點面板外部：收合所有側欄
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".qa-side-panel")) {
            document.querySelectorAll(".qa-side-panel").forEach(function (panel) {
                panel.classList.add("collapsed");
            });
        }
    });
});
