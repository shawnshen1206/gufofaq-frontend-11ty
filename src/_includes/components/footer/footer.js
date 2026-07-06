// 免責聲明按鈕：呼叫 ui/modals 提供的 openModal()
// 原本真實 app 用 inline onclick="openModal('disclaimerModal')"，改為標準 DOM API 綁定事件
document.addEventListener("DOMContentLoaded", function () {
    var openBtn = document.querySelector(".js-open-disclaimer");
    if (openBtn) {
        openBtn.addEventListener("click", function () {
            window.openModal("disclaimerModal");
        });
    }
});
