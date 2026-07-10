// 跳窗開關：標準 <dialog> API（showModal / close），改寫自真實 app 的 js/main.js openModal/closeModal
// 拿掉 flatpickr 初始化（日期選擇不在切版範圍）；曝露 window.openModal / window.closeModal 供其他元件呼叫（例：footer.js）
// 開窗鈕掛 data-open-modal="<dialog id>" 即可（事件委派），markup 不寫 inline onclick
document.addEventListener("DOMContentLoaded", function () {
    function lockBodyScroll() {
        var hasScrollbar = window.innerWidth > document.documentElement.clientWidth;
        if (hasScrollbar) {
            var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = "hidden";
            document.body.style.paddingRight = scrollbarWidth + "px";
        } else {
            document.body.style.overflow = "hidden";
        }
    }

    function unlockBodyScroll() {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
    }

    function openModal(id) {
        var modal = document.getElementById(id);
        if (!modal) return;

        modal.classList.remove("hide");
        modal.classList.add("show");

        modal.showModal();
        lockBodyScroll();
    }

    function closeModal(modal) {
        if (!modal) return;

        modal.classList.remove("show");
        modal.classList.add("hide");
        unlockBodyScroll();

        setTimeout(function () {
            modal.close();
            modal.classList.remove("hide");
        }, 300); // 與動畫時間一致
    }

    document.querySelectorAll(".modals").forEach(function (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target.closest(".btn-close-modals")) {
                closeModal(modal);
            }
        });
    });

    // 開窗鈕：掛 data-open-modal="<dialog id>" 即可，不必寫 inline onclick（§5：行為綁在 js 裡）。
    // 用事件委派，故後續動態插入的按鈕也吃得到（同 toast 的 data-toast 機制）。
    document.addEventListener("click", function (e) {
        var trigger = e.target.closest("[data-open-modal]");
        if (trigger) openModal(trigger.getAttribute("data-open-modal"));
    });

    // 供其他元件（例：footer.js）呼叫
    window.openModal = openModal;
    window.closeModal = closeModal;
});
