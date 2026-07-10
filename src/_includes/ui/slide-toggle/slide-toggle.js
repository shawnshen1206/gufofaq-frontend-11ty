// 高度滑動開合：真實 app 的 jQuery slideDown/slideUp/slideToggle(300) 的原生替代品。
// window.GufoSlide.down(el) / .up(el) / .toggle(el)
//
// 為什麼要有這支：把 display 一次切掉是「啪」一下，跟真 app 的手感差很多，
// 而手機選單、子選單、accordion 明細都要同一套動畫 —— 各寫一份就會走鐘。
//
// 做法：量 scrollHeight，用 Web Animations API 動 height + 上下 padding（jQuery slide 也動 padding），
// 動畫期間 overflow:hidden，結束後把行內樣式清乾淨、只留 display。
// 重入（動畫還沒跑完又點一次）：cancel 掉舊的再排新的，等同 jQuery 的 .stop(true, true)。
//
// 純函式工具，載入時不碰 DOM，故不需要 DOMContentLoaded 包裹。
(function () {
    var DURATION = 300; // 與真實 app 的 slideDown(300) 一致

    function prefersReduced() {
        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function isHidden(el) {
        return getComputedStyle(el).display === "none";
    }

    // 收尾：只留 display，其餘動畫用的行內樣式都清掉
    function settle(el, open) {
        el.style.display = open ? "block" : "none";
        el.style.height = "";
        el.style.overflow = "";
        el.style.paddingTop = "";
        el.style.paddingBottom = "";
        el._gufoSlide = null;
    }

    function run(el, open, ms) {
        if (!el) return;
        if (el._gufoSlide) {
            el._gufoSlide.cancel(); // 舊動畫直接砍掉，不要兩個動畫搶同一個 height
            el._gufoSlide = null;
        }
        // 沒有動畫需求（使用者要求減少動態、或瀏覽器不支援 WAAPI）就直接到位
        if (prefersReduced() || typeof el.animate !== "function") {
            settle(el, open);
            return;
        }

        el.style.display = "block"; // 要量高度就得先看得見
        var cs = getComputedStyle(el);
        var open_ = { height: el.scrollHeight + "px", paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom };
        var shut = { height: "0px", paddingTop: "0px", paddingBottom: "0px" };

        el.style.overflow = "hidden";
        var anim = el.animate([open ? shut : open_, open ? open_ : shut], { duration: ms || DURATION, easing: "ease" });
        el._gufoSlide = anim;
        anim.onfinish = function () { settle(el, open); };
    }

    window.GufoSlide = {
        down: function (el, ms) { run(el, true, ms); },
        up: function (el, ms) { run(el, false, ms); },
        toggle: function (el, ms) { run(el, isHidden(el), ms); },
        // 不帶動畫地設定初始態（頁面載入時不該看到東西「滑」出來）
        set: function (el, open) { if (el) settle(el, open); },
    };
})();
