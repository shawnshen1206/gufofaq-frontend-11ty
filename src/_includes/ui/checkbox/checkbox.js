// checkbox 全選控制：.checkbox-container 內 .check-all 勾選/取消時連動所有 .check-one；反之單一 .check-one 全數勾選時 .check-all 自動勾選
// 行為改寫自真實 app 的 js/main.js「checkbox 全選控制」（原用 jQuery），改為標準 DOM API
document.addEventListener("DOMContentLoaded", function () {
    var containers = document.querySelectorAll(".checkbox-container");

    containers.forEach(function (container) {
        container.addEventListener("click", function (event) {
            var checkAll = event.target.closest(".check-all");
            var checkOne = event.target.closest(".check-one");

            if (checkAll && container.contains(checkAll)) {
                var isChecked = checkAll.checked;
                container.querySelectorAll(".check-one").forEach(function (checkbox) {
                    checkbox.checked = isChecked;
                    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
                });
                return;
            }

            if (checkOne && container.contains(checkOne)) {
                var checkOnes = container.querySelectorAll(".check-one");
                var checkedCount = container.querySelectorAll(".check-one:checked").length;
                var checkAllBox = container.querySelector(".check-all");

                if (checkAllBox) {
                    checkAllBox.checked = checkedCount === checkOnes.length;
                }
            }
        });
    });
});
