// body 捲動鎖：全站唯一寫 document.body.style.overflow 的地方（有測試把關）。
//
// 為什麼要共享：跳窗（ui/modals）與手機選單（components/mobile-nav）都要鎖 body。
// 兩邊各鎖各的話，先關的那個會把「另一個還開著」的鎖一起解掉 —— 同一個全域資源、兩個互不知情的擁有者。
// 這裡用計數器：lock() 累加、unlock() 遞減，歸零才真的放開。巢狀開窗也吃這條。
//
// 純函式工具，載入時不碰 DOM，故不需要 DOMContentLoaded 包裹。
(function () {
    var count = 0;

    function lock() {
        if (count++ > 0) return;
        // 捲軸消失會讓版面橫向跳一下，補等寬 padding 抵銷
        var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + "px";
    }

    function unlock() {
        if (count > 0) count--;
        if (count > 0) return;
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
    }

    window.GufoScrollLock = { lock: lock, unlock: unlock };
})();
