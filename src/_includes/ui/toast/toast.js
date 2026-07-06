// 全域 showToast(message, duration)：改寫自真實 app js/toast.js，原生 DOM API，無 jQuery/vendor 依賴
// 業務 js 直接呼叫全域 showToast(msg, ms)；動態建立 .toast.toast-success 節點，加到 #toastContainer（找不到則退回 body），
// 顯示動畫後於 duration 毫秒淘汰、再等 300ms transition 結束後從 DOM 移除
function showToast(message, duration = 3000) {
    // 動態判斷圖片路徑（根據當前頁面位置）
    const currentPath = window.location.pathname;
    const isInSubfolder = currentPath.includes('/pages/');
    const imagePath = isInSubfolder ? '../../images/' : './images/';

    // 使用原生 JavaScript 創建元素
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';

    const toastIcon = document.createElement('img');
    toastIcon.className = 'toast-icon';
    toastIcon.src = imagePath + 'finish_white.png';
    toastIcon.alt = 'toast-icon';

    const toastText = document.createElement('span');
    toastText.textContent = message;

    toast.appendChild(toastIcon);
    toast.appendChild(toastText);

    // 加到容器（如果沒有就加到 body）
    const container = document.getElementById('toastContainer') || document.body;
    container.appendChild(toast);

    // 顯示動畫
    setTimeout(function() {
        toast.classList.add('show');
    }, 10);

    // 隱藏與移除
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() {
            toast.remove();
        }, 300);
    }, duration);

    return toast;
}
