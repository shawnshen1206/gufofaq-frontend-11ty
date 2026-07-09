// 深色／淺色切換：點擊 .theme-toggle 反轉 <html data-theme>，寫入 localStorage 記住選擇。
// 初始 data-theme 由 base.html <head> 內的 no-flash 內聯腳本設定（讀 localStorage → 否則跟系統），
// 避免載入時白閃；本檔只負責點擊切換與「使用者未選過時跟隨系統變化」。
document.addEventListener("DOMContentLoaded", function () {
    var root = document.documentElement;

    function current() {
        return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }

    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var next = current() === "dark" ? "light" : "dark";
            root.setAttribute("data-theme", next);
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
                root.setAttribute("data-theme", e.matches ? "dark" : "light");
            }
        });
    } catch (e) { }
});
