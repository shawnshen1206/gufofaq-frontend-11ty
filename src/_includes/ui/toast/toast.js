// 全域 showToast(message, type, duration)：改寫自真實 app js/toast.js，原生 DOM API，無 jQuery/vendor。
//   type：'success'（預設，綠）/ 'error'（紅）/ 'warning'（黃）/ 'info'（藍）—— 真實 app 只有 success，多色為本專案擴充。
//   相容舊呼叫 showToast(msg, 2000)：第二參數是數字時視為 duration。
// 另外：自動把任何帶 data-toast 的元素（如聊天室 .copyBtn）點擊 → 彈出該訊息的 toast（可用 data-toast-type 指定顏色）。
function showToast(message, type = 'success', duration = 3000) {
    // 舊簽名相容：showToast(msg, duration)
    if (typeof type === 'number') { duration = type; type = 'success'; }

    const currentPath = window.location.pathname;
    const isInSubfolder = currentPath.includes('/pages/');
    const imagePath = isInSubfolder ? '../../images/' : './images/';

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    // 只有 success 有既有的白色勾勾圖示；其餘類型純色呈現（無對應白圖示）
    if (type === 'success') {
        const toastIcon = document.createElement('img');
        toastIcon.className = 'toast-icon';
        toastIcon.src = imagePath + 'finish_white.png';
        toastIcon.alt = 'toast-icon';
        toast.appendChild(toastIcon);
    }

    const toastText = document.createElement('span');
    toastText.textContent = message;
    toast.appendChild(toastText);

    const container = document.getElementById('toastContainer') || document.body;
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
    document.addEventListener('click', function (e) {
        const el = e.target.closest('[data-toast]');
        if (!el) return;
        showToast(el.getAttribute('data-toast'), el.getAttribute('data-toast-type') || 'success');
    });
});
