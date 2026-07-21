// 可捲動清單 widget（.dataset-list-wrap：搜尋框 + .dataset-list）的關鍵字過濾。
// 純前端互動（§5 當場要動得起來），行為改寫自真 app js/dataImport.js 的 keyword filter：
// 兩邊 toLowerCase 後比對（不分大小寫、不 trim——與真 app 同款），不符的 label 加 .hidden。
// 這顆 widget 由兩個 modal 共用（select-dataset-modal 的 radio 清單、manage-members-modal 的
// checkbox 清單）——過濾行為依 §4「兩個以上元件必須同值」升格成共用行為原子，兩邊都吃得到。
// document 級 input 委派：動態插入的清單也吃得到；載入時不碰 DOM。
document.addEventListener("input", function (e) {
    var search = e.target.closest(".dataset-list-wrap .form-control.search");
    if (!search) return;
    var wrap = search.closest(".dataset-list-wrap");
    var list = wrap && wrap.querySelector(".dataset-list");
    if (!list) return;
    var keyword = search.value.toLowerCase();
    list.querySelectorAll("label").forEach(function (label) {
        label.classList.toggle("hidden", label.textContent.toLowerCase().indexOf(keyword) === -1);
    });
});
