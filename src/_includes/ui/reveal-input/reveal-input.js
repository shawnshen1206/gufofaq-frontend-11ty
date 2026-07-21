// 密碼欄顯示/遮蔽切換（5-9 萃取 API 金鑰）：點按鈕把目標 <input> 的 type 在 password↔text 間切換，
// 按鈕文字「顯示↔隱藏」隨狀態切換。純前端互動（無業務、無 API），故為切版自有元件行為。
// 狀態語意走「換標籤」而非 aria-pressed（ARIA APG：toggle 鈕换標籤與 pressed 二擇一，
// 兩者並用會念出「隱藏、已按下」這種矛盾）。
// 宣告式：按鈕掛 data-reveal-target="<input id>"（比照 data-open-modal / data-toast 的事件委派，見 §5），
// 兩態文字與 i18n key 由 markup 的 data-text-* / data-key-* 提供，JS 不寫死字串（見 §4-2）。
document.addEventListener("DOMContentLoaded", function () {
    function t(key, zh) {
        return (window.GufoI18n && window.GufoI18n.t) ? window.GufoI18n.t(key, zh) : zh;
    }

    // 同步改寫 data-i18n key，切換語言時 lang-toggle 才會依「當下狀態」重譯
    function label(btn, revealed) {
        var zh = revealed ? btn.getAttribute("data-text-hide") : btn.getAttribute("data-text-show");
        var key = revealed ? btn.getAttribute("data-key-hide") : btn.getAttribute("data-key-show");
        btn.textContent = t(key, zh || "");
        btn.setAttribute("data-i18n", key);
    }

    function targetOf(btn) { return document.getElementById(btn.getAttribute("data-reveal-target")); }

    // document 級委派：點外部判斷用 closest，動態插入的按鈕也吃得到
    document.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-reveal-target]");
        if (!btn) return;
        var input = targetOf(btn);
        if (!input) return;
        var revealed = input.type !== "text"; // 切換後的狀態
        input.type = revealed ? "text" : "password";
        label(btn, revealed);
    });

    // 切換語言後依「當下狀態」重畫按鈕文字（顯示 ↔ 隱藏）
    document.addEventListener("gufo:langchange", function () {
        document.querySelectorAll("[data-reveal-target]").forEach(function (btn) {
            var input = targetOf(btn);
            label(btn, !!input && input.type === "text");
        });
    });
});
