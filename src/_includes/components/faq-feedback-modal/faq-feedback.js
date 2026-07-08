// 前台 FAQ 回饋 modal 的讚/倒讚二選一：點選定選、所在 modal 關閉時重置。
// 由訊息的讚/倒讚動作鈕透過 window.openFeedback('like'|'dislike') 開啟並預選，讓人接著填理由。
document.addEventListener("DOMContentLoaded", function () {
    var modal = document.getElementById("likeModal");
    if (!modal) return;

    var buttons = modal.querySelectorAll(".feedback-vote-btn");

    function select(vote) {
        buttons.forEach(function (btn) {
            var on = btn.dataset.vote === vote;
            btn.classList.toggle("active", on);
            btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
    }

    buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            select(btn.dataset.vote);
        });
    });

    // 關閉時重置選取
    modal.addEventListener("close", function () {
        select(null);
    });

    // 供訊息動作鈕呼叫：預選讚/倒讚後開啟 modal
    window.openFeedback = function (vote) {
        select(vote);
        if (window.openModal) window.openModal("likeModal");
    };
});
