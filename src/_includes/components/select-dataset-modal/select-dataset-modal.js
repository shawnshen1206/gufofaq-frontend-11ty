// 選擇資料集 modal 的純前端互動（§5：搜尋過濾與確認回填都不送 API，是切版自己的行為，當場要動得起來）。
// 行為改寫自真 app js/dataImport.js（原生 DOM）：
//   - 搜尋框即時過濾清單（dataImport.js 的 keyword filter：比對 label 文字、不符者隱藏）
//   - 確認鈕讀 input[name="dataset_radio"]:checked，把選到的名稱回填頁面上的模擬 select
//     （dataImport.js：.select-placeholder 藏起來、.select-value 填字並顯示）
// 模擬 select 是使用頁（1-1-1）的一次性 markup、class 沿用真 app（.select-placeholder/.select-value）；
// 元件庫展示頁沒有那顆模擬 select，querySelector 落空即安全跳過。
// 關窗交給既有的 .btn-close-modals（ui/modals），本檔不碰 dialog 開合。
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("#datasetModal").forEach(function (modal) {
        var search = modal.querySelector(".form-control.search");
        var list = modal.querySelector(".dataset-list");

        if (search && list) {
            search.addEventListener("input", function () {
                var keyword = search.value.trim();
                list.querySelectorAll("label").forEach(function (label) {
                    var hit = label.textContent.indexOf(keyword) !== -1;
                    label.classList.toggle("hidden", !hit);
                });
            });
        }

        var confirmBtn = modal.querySelector(".modals-footer .button-primary");
        if (confirmBtn) {
            confirmBtn.addEventListener("click", function () {
                var checked = modal.querySelector('input[name="dataset_radio"]:checked');
                if (!checked) return;
                var fakeSelect = document.querySelector('[data-open-modal="datasetModal"]');
                if (!fakeSelect) return; // 元件庫展示頁的示範觸發器沒有 placeholder/value 結構
                var placeholder = fakeSelect.querySelector(".select-placeholder");
                var value = fakeSelect.querySelector(".select-value");
                if (!placeholder || !value) return;
                placeholder.classList.add("hidden");
                value.textContent = checked.value;
                value.classList.remove("hidden");
            });
        }
    });
});
