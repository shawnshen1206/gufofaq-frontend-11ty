// 篩選列的「清除」：把同一個 .block 裡的篩選欄位全部回到預設值。
// 對應真實 app 的 js/main.js:841-856（該處同樣以 closest(".block") 定範圍），純 UI（只清 DOM 的值，查詢是另一顆鈕的業務 js）。
//
// 範圍查詢用了 ui/block 的 .block 當容器邊界——這是「唯讀的結構定位」、與真 app 同款，
// 不改寫也不樣式它（§4 的「用」而非「改」）；欄位本身只碰原生表單元素。
// `.error` 是 §4 明列的全站共用狀態 class（不是某個元件私有的），清欄位時一併清掉才不會留下紅框。
document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (e) {
        var btn = e.target.closest(".js-filter-clear");
        if (!btn) return;

        var block = btn.closest(".block");
        if (!block) return;
        // 有 .filter-fields 就只清它；沒有的話（4-1／5-7 的篩選列是就地寫的 form-group）清整個 .block
        var fields = block.querySelector(".filter-fields") || block;

        fields.querySelectorAll("input, textarea").forEach(function (el) {
            // 只清文字類欄位：真 app 綁的是 input.form-control；checkbox/radio 的 value 不是使用者輸入，不動
            if (el.type === "checkbox" || el.type === "radio") return;
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
