// 跳窗開關：標準 <dialog> API（showModal / close），改寫自真實 app 的 js/main.js openModal/closeModal
// 拿掉 flatpickr 初始化（日期選擇不在切版範圍）；曝露 window.openModal 供其他元件呼叫
// （例：faq-feedback-modal.js 的 openFeedback 要先預選讚/倒讚再開窗，無法用宣告式屬性表達）。
// 只是「點了就開窗」的按鈕不要寫 js —— 掛 data-open-modal="<dialog id>"，由下面的事件委派接手（§5）。
document.addEventListener("DOMContentLoaded", function () {
    // body 捲動鎖走 ui/scroll-lock 的共享計數器（巢狀開窗、以及和手機選單搶同一個 body 都靠它）。
    // 懶讀而不是在這裡取值：一旦 scroll-lock.js 沒載入，取值會擲例外並中斷整個 DOMContentLoaded callback，
    // 於是連關窗鈕、Esc 解鎖、data-open-modal 委派全部沒註冊 —— 少一支捲動鎖不該讓所有跳窗一起死。
    function lockBodyScroll() { if (window.GufoScrollLock) window.GufoScrollLock.lock(); }
    function unlockBodyScroll() { if (window.GufoScrollLock) window.GufoScrollLock.unlock(); }

    function openModal(id) {
        var modal = document.getElementById(id);
        if (!modal) return;

        // 關閉動畫還沒跑完就重開：dialog 其實還開著、body 也還鎖著，
        // 取消排隊中的 close 回到 show 態即可。不取消的話 300ms 後它會把剛開的窗關掉。
        if (modal._closeTimer) {
            clearTimeout(modal._closeTimer);
            modal._closeTimer = null;
            modal.classList.remove("hide");
            modal.classList.add("show");
            return;
        }
        if (modal.open) return; // 已經開著

        modal.classList.remove("hide");
        modal.classList.add("show");

        modal.showModal();
        modal._gufoLocked = true; // 只有「我鎖的」才由我解；別的路徑關掉的 dialog 不該去減別人的計數
        lockBodyScroll();
    }

    function closeModal(modal) {
        if (!modal || !modal.open) return;
        if (modal._closeTimer) return; // 關閉動畫還在跑：不要再排一顆 timer 覆寫掉舊的參照

        modal.classList.remove("show");
        modal.classList.add("hide");

        modal._closeTimer = setTimeout(function () {
            modal._closeTimer = null;
            modal.close(); // 觸發 close 事件 → 由下面的 handler 統一收尾
        }, 300); // 與動畫時間一致
    }

    document.querySelectorAll(".modals").forEach(function (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target.closest(".btn-close-modals")) {
                closeModal(modal);
            }
        });

        // 收尾統一走原生的 close 事件。**按 Esc 是瀏覽器直接關掉 dialog、不會經過 closeModal()**，
        // 少了這條，body 的 overflow:hidden 就永遠解不開，整頁捲動被鎖死。
        modal.addEventListener("close", function () {
            if (modal._closeTimer) {
                clearTimeout(modal._closeTimer);
                modal._closeTimer = null;
            }
            modal.classList.remove("show", "hide");
            if (modal._gufoLocked) {
                modal._gufoLocked = false;
                unlockBodyScroll();
            }
        });
    });

    // 開窗鈕：掛 data-open-modal="<dialog id>" 即可，不必寫 inline onclick（§5：行為綁在 js 裡）。
    // 用事件委派，故後續動態插入的按鈕也吃得到（同 toast 的 data-toast 機制）。
    document.addEventListener("click", function (e) {
        var trigger = e.target.closest("[data-open-modal]");
        if (trigger) openModal(trigger.getAttribute("data-open-modal"));
    });

    // 供「需要先做別的事再開窗」的元件呼叫（例：faq-feedback-modal.js）
    window.openModal = openModal;
    window.closeModal = closeModal;
});
