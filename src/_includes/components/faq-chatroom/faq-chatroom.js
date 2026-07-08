// 前台 FAQ 聊天：捲到最底按鈕。捲動超過 100px 顯示按鈕、點擊平滑捲到底。
// 改寫自真實 app main.js（原生 DOM）。串流送問答等屬業務邏輯不在此。
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".faq-chatroom").forEach(function (room) {
        var scroll = room.querySelector(".faq-chat-scroll");
        var btn = room.querySelector(".js-scroll-bottom");
        if (!scroll || !btn) return;

        scroll.addEventListener("scroll", function () {
            var fromBottom = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight;
            btn.classList.toggle("show", fromBottom > 100);
        });

        btn.addEventListener("click", function () {
            scroll.scrollTo({ top: scroll.scrollHeight, behavior: "smooth" });
        });
    });
});
