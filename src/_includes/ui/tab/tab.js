// tab 頁籤切換：改寫自真實 app js/main.js「tab頁籤切換」（原用 jQuery），改用原生 DOM API
// 只轉切版互動（切換 .active / 顯示對應群組），資料載入/API 等業務邏輯不在此列
document.addEventListener("DOMContentLoaded", function () {
    // 第一層頁籤切換
    document.querySelectorAll(".top-tabs .tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            // 樣式切換
            var siblings = Array.prototype.filter.call(tab.parentElement.children, function (el) {
                return el !== tab;
            });
            tab.classList.add("active");
            siblings.forEach(function (el) {
                el.classList.remove("active");
            });

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

    // 第二層頁籤切換
    document.querySelectorAll(".sub-tabs .tab").forEach(function (tab) {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".sub-tabs .tab").forEach(function (el) {
                el.classList.remove("active");
            });
            tab.classList.add("active");
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
                    tab.classList.add("active");
                    siblings.forEach(function (el) {
                        el.classList.remove("active");
                    });
                });
            });
        }
    });
});
