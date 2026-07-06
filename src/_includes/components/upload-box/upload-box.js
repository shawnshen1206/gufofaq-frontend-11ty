// 檔案上傳區：點擊開啟原生檔案選擇窗、拖曳時切換 .drag-over 樣式 class
// 行為改寫自真實 app 的 js/main.js 696-716 行（原用 jQuery），僅轉切版視覺行為；
// 實際讀檔/上傳 API 邏輯（uploadFile_excel.js、uploadFilePdf.js 等）為業務邏輯，不轉。
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".upload-box").forEach(function (box) {
        var input = box.parentElement ? box.parentElement.querySelector(".upload-input") : null;
        if (!input) {
            input = box.querySelector(".upload-input");
        }

        box.addEventListener("click", function () {
            if (input) input.click();
        });

        if (input) {
            input.addEventListener("click", function (e) {
                e.stopPropagation(); // 防止觸發父層 click 導致無限迴圈
            });
        }

        // 拖曳進入
        ["dragenter", "dragover"].forEach(function (evtName) {
            box.addEventListener(evtName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                box.classList.add("drag-over");
            });
        });

        // 拖曳離開
        ["dragleave", "dragend", "drop"].forEach(function (evtName) {
            box.addEventListener(evtName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                box.classList.remove("drag-over");
            });
        });
    });
});
