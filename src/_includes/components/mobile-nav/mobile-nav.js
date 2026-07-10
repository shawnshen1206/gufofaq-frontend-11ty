// 手機版選單：切換開關、鎖定/解鎖 body 捲動、子選單展開收合
// 行為改寫自真實 app 的 js/main.js（原用 jQuery + slideDown/slideUp），改為標準 DOM API
document.addEventListener("DOMContentLoaded", function () {
    var navToggle = document.querySelector(".nav-toggle");
    var menuWrap = document.querySelector(".mobile-menu-wrap");
    var overlay = document.querySelector(".mobile-nav .overlay");
    if (!navToggle || !menuWrap || !overlay) return;

    var submenuLinks = document.querySelectorAll(".mobile-menu .dropdown");

    function isOpen() {
        return navToggle.classList.contains("active");
    }

    // 漢堡在收合斷點以外是 display:none。不要在這裡複寫那個斷點 ——
    // 直接問 CSS「漢堡現在看得見嗎」，斷點就只有 _mixin.scss 的 nav-collapsed 一份真相。
    function hamburgerHidden() {
        return getComputedStyle(navToggle).display === "none";
    }

    function closeAllSubmenus() {
        submenuLinks.forEach(function (link) {
            var submenu = link.parentElement.querySelector("ul");
            if (submenu) window.GufoSlide.set(submenu, false); // 不帶動畫，選單已經關了
            link.setAttribute("aria-expanded", "false");
        });
    }

    function setOpen(open) {
        if (open === isOpen()) return;
        navToggle.classList.toggle("active", open);
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        overlay.classList.toggle("active", open);
        // 真 app 是 slideDown/slideUp(300)，不是 display 一次切掉
        if (open) {
            window.GufoSlide.down(menuWrap);
            window.GufoScrollLock.lock();
        } else {
            window.GufoSlide.up(menuWrap);
            window.GufoScrollLock.unlock();
            closeAllSubmenus(); // 下次開啟時回到全部收合的初始樣子
        }
    }

    navToggle.addEventListener("click", function () {
        setOpen(!isOpen());
    });

    // 選單開著時把視窗拉寬過收合斷點，漢堡會被 CSS 藏起來 —— 少了這段，
    // 遮罩與選單留在原地、body 也還鎖著，而唯一關得掉它的那顆鈕已經不見了，只能重整。
    window.addEventListener("resize", function () {
        if (isOpen() && hamburgerHidden()) setOpen(false);
    });

    // 子選單開關（手機版點擊展開/收合）
    submenuLinks.forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            var submenu = link.parentElement.querySelector("ul");
            if (!submenu) return;
            var open = getComputedStyle(submenu).display === "none"; // 真 app 是 slideToggle(300)
            window.GufoSlide.toggle(submenu);
            link.setAttribute("aria-expanded", open ? "true" : "false");
        });
    });
});
