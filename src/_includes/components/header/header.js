// header 桌機下拉選單的無障礙補完。
//
// 展開/收合本身是純 CSS：_header.scss 的 `li:hover > ul` 與 `li:focus-within > ul`
// （原真實 app 用 superfish JS，切版改 CSS-hover；只有 hover 的話鍵盤使用者完全打不開子選單）。
// CSS 改不了 ARIA，故本檔只做一件事：讓 aria-expanded 反映「子選單當下是否顯示」。
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".desktop-nav .main-menu > li").forEach(function (li) {
        var trigger = li.querySelector(":scope > a.dropdown");
        var submenu = li.querySelector(":scope > ul");
        if (!trigger || !submenu) return;

        function set(open) {
            trigger.setAttribute("aria-expanded", open ? "true" : "false");
        }
        set(false);

        li.addEventListener("mouseenter", function () { set(true); });
        li.addEventListener("mouseleave", function () { set(false); });
        li.addEventListener("focusin", function () { set(true); });
        li.addEventListener("focusout", function (event) {
            // 焦點仍在本 li 內（例如移到子選單連結）就維持展開
            if (!li.contains(event.relatedTarget)) set(false);
        });
    });
});
