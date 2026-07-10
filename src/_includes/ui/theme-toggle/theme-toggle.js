// 深色／淺色切換：點擊 .theme-toggle 反轉 <html data-theme>，寫入 localStorage 記住選擇。
// 初始 data-theme 由 base.html <head> 內的 no-flash 內聯腳本設定（讀 localStorage → 否則跟系統），
// 避免載入時白閃；本檔只負責點擊切換與「使用者未選過時跟隨系統變化」。
document.addEventListener("DOMContentLoaded", function () {
    var root = document.documentElement;

    function current() {
        return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }

    // 行動瀏覽器網址列顏色跟著主題。值直接讀 --surface-raised（header 底色）的 computed 值，
    // 不在這裡複寫色碼 —— 本檔在 CSS 載入後才跑，讀得到；改了 token 這裡自動跟上（§4：顏色只有一份）。
    function apply(theme) {
        root.setAttribute("data-theme", theme);
        var m = document.querySelector('meta[name="theme-color"]');
        if (!m) return;
        // 讀不到（樣式表沒載成功）就不動 meta，留著 no-flash 寫的值 —— 那種情況整頁本來就沒樣式了。
        var c = getComputedStyle(root).getPropertyValue("--surface-raised").trim();
        if (c) m.setAttribute("content", c);
    }

    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var next = current() === "dark" ? "light" : "dark";
            apply(next);
            try {
                localStorage.setItem("theme", next);
            } catch (e) { }
        });
    });

    // 使用者尚未手動選過（localStorage 無 theme）時，跟隨系統深/淺切換
    try {
        var mq = window.matchMedia("(prefers-color-scheme: dark)");
        mq.addEventListener("change", function (e) {
            if (!localStorage.getItem("theme")) {
                apply(e.matches ? "dark" : "light");
            }
        });
    } catch (e) { }
});
