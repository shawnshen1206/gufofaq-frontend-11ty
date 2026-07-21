// 選擇資料集 modal 的確認回填（§5 純前端互動，當場要動得起來）。
// 行為改寫自真 app js/dataImport.js：關窗鈕（.btn-close-modals——含右上角 X，真 app 綁的就是
// 這個範圍、任一關窗都會提交當前選取）讀 input[name="dataset_radio"]:checked，把選到的名稱
// 回填頁面上的模擬 select（.select-placeholder 藏起來、.select-value 填字並顯示）。
// 搜尋過濾在共用的 ui/list-filter（同 widget 的 manage-members-modal 也吃同一份）。
// 模擬 select 是使用頁（1-1-1）的一次性 markup、class 沿用真 app（.select-placeholder/.select-value）；
// 元件庫展示頁的示範觸發器打得開本 modal 但沒有 placeholder/value 結構，由下方兩層 querySelector
// 落空守衛安全跳過。關窗本身交給既有的 .btn-close-modals 委派（ui/modals），本檔不碰 dialog 開合。
document.addEventListener("DOMContentLoaded", function () {
    var modal = document.getElementById("datasetModal");
    if (!modal) return;
    modal.querySelectorAll(".btn-close-modals").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var checked = modal.querySelector('input[name="dataset_radio"]:checked');
            if (!checked) return;
            var fakeSelect = document.querySelector('[data-open-modal="datasetModal"]');
            if (!fakeSelect) return;
            var placeholder = fakeSelect.querySelector(".select-placeholder");
            var value = fakeSelect.querySelector(".select-value");
            if (!placeholder || !value) return; // 元件庫展示頁的觸發鈕沒有這兩個槽
            placeholder.classList.add("hidden");
            value.textContent = checked.value;
            value.classList.remove("hidden");
        });
    });
});
