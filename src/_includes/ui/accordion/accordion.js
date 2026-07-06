// accordion 手風琴：改寫自真實 app js/main.js「表格 accordion 控制」（原用 jQuery + slideUp/slideDown），改用原生 DOM API + display 切換
// 只轉切版互動（開合本身），資料載入/API 等業務邏輯不在此列
document.addEventListener("DOMContentLoaded", function () {
    // §1 原子解耦：掃描 accordion 自有的 .js-accordion 根，不再綁定 components/ 的 .sources-block
    var blocks = document.querySelectorAll(".js-accordion");

    blocks.forEach(function (block) {
        // 預設隱藏所有詳細內容
        block.querySelectorAll(".accordion-content").forEach(function (content) {
            content.style.display = "none";
        });

        function findContent(btn) {
            var row = btn.closest("tr");
            var detailRow = row ? row.nextElementSibling : null;
            if (!detailRow || !detailRow.classList.contains("detail-row")) return null;
            return detailRow.querySelector(".accordion-content");
        }

        function setSrOnly(btn, text) {
            var srOnly = btn.querySelector(".sr-only");
            if (srOnly) srOnly.textContent = text;
        }

        function openAccordion(btn) {
            var content = findContent(btn);
            btn.classList.add("open");
            btn.setAttribute("aria-expanded", "true");
            btn.setAttribute("title", "收合表格");
            setSrOnly(btn, "收合表格");
            if (content) content.style.display = "block";
        }

        function closeAccordion(btn) {
            var content = findContent(btn);
            btn.classList.remove("open");
            btn.setAttribute("aria-expanded", "false");
            btn.setAttribute("title", "展開表格");
            setSrOnly(btn, "展開表格");
            if (content) content.style.display = "none";
        }

        // 單筆開關
        block.addEventListener("click", function (event) {
            var btn = event.target.closest(".accordion-btn");
            if (!btn || !block.contains(btn)) return;

            if (btn.classList.contains("open")) {
                closeAccordion(btn);
            } else {
                openAccordion(btn);
            }
        });

        // 全部展開
        var expandAll = block.querySelector(".js-expand-all");
        if (expandAll) {
            expandAll.addEventListener("click", function () {
                block.querySelectorAll(".accordion-btn").forEach(function (btn) {
                    btn.classList.add("open");
                    btn.setAttribute("title", "收合表格");
                    setSrOnly(btn, "收合表格");
                });
                block.querySelectorAll(".accordion-content").forEach(function (content) {
                    content.style.display = "block";
                });
            });
        }

        // 全部收合
        var collapseAll = block.querySelector(".js-collapse-all");
        if (collapseAll) {
            collapseAll.addEventListener("click", function () {
                block.querySelectorAll(".accordion-btn").forEach(function (btn) {
                    btn.classList.remove("open");
                    btn.setAttribute("title", "展開表格");
                    setSrOnly(btn, "展開表格");
                });
                block.querySelectorAll(".accordion-content").forEach(function (content) {
                    content.style.display = "none";
                });
            });
        }
    });
});
