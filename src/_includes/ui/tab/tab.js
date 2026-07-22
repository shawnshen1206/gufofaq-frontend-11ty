// tab 頁籤切換：改寫自真實 app js/main.js「tab頁籤切換」（原用 jQuery），改用原生 DOM API
// 只轉切版互動（切換 .active / 顯示對應群組），資料載入/API 等業務邏輯不在此列
// 選中態同步進 ARIA：.active 只是視覺，報讀器聽不到——每一條改變選中態的路徑都同步 aria-current
// （§4「狀態要寫進 ARIA」；markup 的初始 active 頁籤也帶 aria-current="true"）
document.addEventListener("DOMContentLoaded", function () {
    function setCurrent(tab, actives) {
        actives.forEach(function (el) {
            el.classList.remove("active");
            el.removeAttribute("aria-current");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-current", "true");
    }

    // 第一層頁籤切換
    document.querySelectorAll(".top-tabs .tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            var siblings = Array.prototype.filter.call(tab.parentElement.children, function (el) {
                return el !== tab;
            });
            setCurrent(tab, siblings);

            // 取得目標群組
            var target = tab.getAttribute("data-target");

            // 顯示對應的第二層頁籤群組
            document.querySelectorAll(".sub-tabs").forEach(function (group) {
                group.style.display = "none";
            });
            var targetGroup = target ? document.getElementById(target) : null;
            if (targetGroup) targetGroup.style.display = "";
        });
    });

    // 第二層頁籤切換（真 app 行為：清掉所有 .sub-tabs 裡的選中，跨群組全域）
    document.querySelectorAll(".sub-tabs .tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            setCurrent(tab, Array.prototype.slice.call(document.querySelectorAll(".sub-tabs .tab")));

            // 帶 data-target 的子頁籤：切換對應的 .tab-content 內容面板（對話設定 hub 的主題子頁籤）。
            // 元件庫雙層示範的子頁籤沒有 data-target，維持原行為、不碰內容面板。
            var target = tab.getAttribute("data-target");
            if (target) {
                document.querySelectorAll(".tab-content").forEach(function (panel) {
                    panel.style.display = "none";
                });
                var activePanel = document.getElementById(target);
                if (activePanel) activePanel.style.display = "";
            }
        });
    });

    // 只有一層頁籤
    document.querySelectorAll(".tab-group").forEach(function (group) {
        if (!group.classList.contains("top-tabs") && !group.classList.contains("sub-tabs")) {
            group.querySelectorAll(".tab").forEach(function (tab) {
                tab.addEventListener("click", function () {
                    var siblings = Array.prototype.filter.call(tab.parentElement.children, function (el) {
                        return el !== tab;
                    });
                    setCurrent(tab, siblings);
                });
            });
        }
    });
});
