// 手機版選單：切換開關、鎖定/解鎖 body 捲動、子選單展開收合
// 行為改寫自真實 app 的 js/main.js（原用 jQuery + slideDown/slideUp），改為標準 DOM API
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

    var navToggle = document.querySelector(".nav-toggle");
    var menuWrap = document.querySelector(".mobile-menu-wrap");
    var overlay = document.querySelector(".mobile-nav .overlay");

    if (navToggle && menuWrap && overlay) {
        navToggle.addEventListener("click", function () {
            navToggle.classList.toggle("active");

            if (navToggle.classList.contains("active")) {
                menuWrap.style.display = "block";
                overlay.classList.add("active");
                lockBodyScroll();
            } else {
                menuWrap.style.display = "none";
                overlay.classList.remove("active");
                unlockBodyScroll();
            }
        });
    }

    // 子選單開關（手機版點擊展開/收合）
    document.querySelectorAll(".mobile-menu .dropdown").forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            var submenu = link.parentElement.querySelector("ul");
            if (!submenu) return;
            submenu.style.display = submenu.style.display === "block" ? "none" : "block";
        });
    });
});
