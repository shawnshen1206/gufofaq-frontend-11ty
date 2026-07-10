// 提示詞草稿卡：「新增提示詞」把 .prompt-card.draft 顯示出來，草稿卡內的「取消」把它收回去並清空內容。
// 對應真實 app 的 js/main.js:859-875（$(".js-add-prompt") / $(".prompt-card.draft .js-prompt-cancel")），
// 純 UI —— 真正的「儲存/建立版本」是 .js-prompt-save 的業務 js，切版不碰。
//
// 開啟鈕 .js-add-prompt 住在頁面的篩選列，不在卡片裡；比照 footer 內含 disclaimer-modal 的關係，
// 由「被開的那個東西」的元件 js 認自己的觸發鈕。
document.addEventListener("DOMContentLoaded", function () {
    var draft = document.querySelector(".prompt-card.draft");
    if (!draft) return;

    document.addEventListener("click", function (e) {
        if (e.target.closest(".js-add-prompt")) {
            draft.classList.remove("hidden");
            var input = draft.querySelector(".js-prompt-input");
            if (input) input.focus();
            return;
        }
        // 只認草稿卡自己的取消鈕：既有的提示詞卡片也有同名的取消鈕（編輯態），那顆不歸這裡管
        var cancel = e.target.closest(".js-prompt-cancel");
        if (cancel && draft.contains(cancel)) {
            draft.classList.add("hidden");
            draft.querySelectorAll(".js-prompt-input").forEach(function (input) {
                input.value = "";
            });
        }
    });
});
