// 前台 FAQ 聊天：捲到最底按鈕、訊息的讚／倒讚。
// 改寫自真實 app main.js（原生 DOM）。串流送問答等屬業務邏輯不在此。
// 讚/倒讚要先預選 like/dislike 再開窗，只能命令式呼叫 faq-feedback-modal 匯出的 openFeedback()（§5）。
// 分享是「點了就開窗」，掛 data-open-modal 交給 ui/modals 的委派，這裡不寫 js。
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
    });
});
