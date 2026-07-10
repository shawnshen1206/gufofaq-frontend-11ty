// 參考來源區塊：真實頁預設隱藏（sourcesHidden → .hidden），由聊天訊息的「查看來源」鈕打開。
// 對應真實 app 的 js/main.js:322（$(".watchBtn").click → $(".sources-block").removeClass("hidden")）。
//
// 開啟的觸發鈕住在 components/chatroom（那是它的 class），故這裡只匯出一個函式讓它呼叫，
// 不去指名別人的 .watchBtn（§5：要操作別的元件，呼叫該元件 js 提供的函式）。
document.addEventListener("DOMContentLoaded", function () {
    // 供 chatroom.js 呼叫：把本頁的參考來源區塊顯示出來
    window.GufoSources = {
        show: function () {
            document.querySelectorAll(".sources-block.hidden").forEach(function (block) {
                block.classList.remove("hidden");
            });
        },
    };
});
