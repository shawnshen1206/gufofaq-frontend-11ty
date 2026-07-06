// 跳窗開關：標準 <dialog> API（showModal / close），改寫自真實 app 的 js/main.js openModal/closeModal
// 拿掉 flatpickr 初始化（日期選擇不在切版範圍）；曝露 window.openModal / window.closeModal 供其他元件呼叫（例：footer.js）
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

    // 供其他元件（例：footer.js）呼叫
    window.openModal = openModal;
    window.closeModal = closeModal;
});
