// 篩選列的「清除」：把同一個 .block 裡的篩選欄位全部回到預設值。
// 對應真實 app 的 js/main.js:841-856，純 UI（只清 DOM 的值，查詢是另一顆鈕的業務 js）。
//
// 只操作自己容器內的原生表單元素（input / select / textarea），不指名別的元件的 class。
// `.error` 是 §4 明列的全站共用狀態 class（不是某個元件私有的），清欄位時一併清掉才不會留下紅框。
document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (e) {
        var btn = e.target.closest(".js-filter-clear");
        if (!btn) return;

        var block = btn.closest(".block");
        var fields = block && block.querySelector(".filter-fields");
        if (!fields) return;

        fields.querySelectorAll("input, textarea").forEach(function (el) {
            el.value = "";
            el.classList.remove("error");
        });
        fields.querySelectorAll("select").forEach(function (el) {
            el.selectedIndex = 0; // 回到 placeholder 那個空 option
            el.classList.remove("error");
            el.dispatchEvent(new Event("change", { bubbles: true })); // 讓自訂下拉跟著重畫
        });
    });
});
