// 全域 showToast(message, type, duration, host)：改寫自真實 app js/toast.js，原生 DOM API，無 jQuery/vendor。
//   type：'success'（預設，綠）/ 'error'（紅）/ 'warning'（黃）/ 'info'（藍）—— 真實 app 只有 success，多色為本專案擴充。
//   host：toast 要掛在哪個 <dialog> 裡（省略＝掛頁面層的 #toastContainer）。
//   相容舊呼叫 showToast(msg, 2000)：第二參數是數字時視為 duration。
// 另外：自動把任何帶 data-toast 的元素（如聊天室 .copyBtn）點擊 → 彈出該訊息的 toast（可用 data-toast-type 指定顏色）。
//
// 為什麼 toast 要認 dialog：showModal() 的 <dialog> 在瀏覽器的 top layer，
// 頁面層的 position:fixed 不管 z-index 開多大都蓋不過它。跳窗裡按複製鈕，
// toast 會被畫在跳窗底下看不見。真實 app 也是把 toast 塞進所在的 .modals 裡（Standard/js/main.js:71）。
// 每個 <dialog> 需要自己的 live region。DOMContentLoaded 時會替當時在場的 dialog 先建好
// （aria-live 區塊必須先存在，內容之後才變動，螢幕報讀器才會念）；之後才插入的 dialog 在這裡補建 ——
// 少了這行，動態 dialog 裡的 toast 會掉回頁面層的 #toastContainer，被 top layer 蓋住、完全看不見。
function ensureToastRegion(dialog) {
    let region = dialog.querySelector(':scope > .toast-region');
    if (region) return region;
    region = document.createElement('div');
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    dialog.appendChild(region);
    return region;
}

function showToast(message, type = 'success', duration = 3000, host = null) {
    // 舊簽名相容：showToast(msg, duration)
    if (typeof type === 'number') { duration = type; type = 'success'; }

    // permalink 一律扁平輸出到 dist/ 根（§1），故圖片路徑恆為 ./images/
    const imagePath = './images/';

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    // 只有 success 有既有的白色勾勾圖示；其餘類型純色呈現（無對應白圖示）
    if (type === 'success') {
        const toastIcon = document.createElement('img');
        toastIcon.className = 'toast-icon';
        toastIcon.src = imagePath + 'finish_white.png';
        toastIcon.width = 24;
        toastIcon.height = 24;
        toastIcon.decoding = 'async';
        toastIcon.alt = '';
        toast.appendChild(toastIcon);
    }

    const toastText = document.createElement('span');
    toastText.textContent = message;
    toast.appendChild(toastText);

    const container =
        (host && ensureToastRegion(host)) ||
        document.getElementById('toastContainer') ||
        document.body;
    container.appendChild(toast);

    setTimeout(function () { toast.classList.add('show'); }, 10);
    setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () { toast.remove(); }, 300);
    }, duration);

    return toast;
}

// data-toast 元素點擊 → 彈 toast（event delegation，涵蓋 .copyBtn 等；真實 app 為 $('.copyBtn').on('click',...)）
document.addEventListener('DOMContentLoaded', function () {
    // 選 dialog 而非 .modals，才不會在 toast 的 js 裡指名別的元件的 class。
    document.querySelectorAll('dialog').forEach(ensureToastRegion);

    document.addEventListener('click', function (e) {
        const el = e.target.closest('[data-toast]');
        if (!el) return;
        showToast(el.getAttribute('data-toast'), el.getAttribute('data-toast-type') || 'success', 3000,
            el.closest('dialog[open]'));
    });
});
