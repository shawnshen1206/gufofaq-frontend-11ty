// 聊天室的訊息動作鈕。目前只有「查看來源」需要行為：把頁面上的參考來源區塊顯示出來。
// 對應真實 app 的 js/main.js:322，純 UI（顯示已在 markup 裡的區塊），不是業務邏輯。
//
// 「複製」鈕走 data-toast（ui/toast 的委派）；`.copyBtn` 是真 app 綁剪貼簿的掛點，原樣保留（§5）。
//
// 用 document 委派而非 chatroom 根：2-2-3 的 A/B 比對訊息是就地手寫的同一組動作鈕（.watchBtn），
// 不在 chatroom 元件裡；那一頁沒有 .sources-block，show() 自然是空動作，與真 app 一致。
document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".watchBtn")) return;
        if (window.GufoSources) window.GufoSources.show();
    });
});
