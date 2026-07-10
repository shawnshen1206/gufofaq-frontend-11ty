// 前台 FAQ 聊天：捲到最底按鈕、訊息的讚／倒讚／分享。
// 改寫自真實 app main.js（原生 DOM）。串流送問答等屬業務邏輯不在此。
// 讚/倒讚/分享是別元件的彈窗，透過它們匯出的全域函式開啟（§5），事件在此綁定、不寫 inline onclick。
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".faq-chatroom").forEach(function (room) {
        var scroll = room.querySelector(".faq-chat-scroll");
        var btn = room.querySelector(".js-scroll-bottom");

        if (scroll && btn) {
            scroll.addEventListener("scroll", function () {
                var fromBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight;
                btn.classList.toggle("show", fromBottom > 100);
            });

            btn.addEventListener("click", function () {
                scroll.scrollTo({ top: scroll.scrollHeight, behavior: "smooth" });
            });
        }

        room.querySelectorAll(".js-vote").forEach(function (vote) {
            vote.addEventListener("click", function () {
                if (window.openFeedback) window.openFeedback(vote.getAttribute("data-vote"));
            });
        });

        room.querySelectorAll(".js-share").forEach(function (share) {
            share.addEventListener("click", function () {
                if (window.openModal) window.openModal("shareModal");
            });
        });
    });
});
