// 星等評分：點選定分、hover 預覽、所在 modal 關閉時重置。改寫自真實 app main.js（原生 DOM）。
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".star-container").forEach(function (container) {
        var stars = container.querySelectorAll(".star-icon");
        var current = 0;

        function render(temp) {
            stars.forEach(function (star, i) {
                star.classList.toggle("active", i < temp);
            });
        }

        stars.forEach(function (star, index) {
            star.addEventListener("click", function () {
                current = index + 1;
                render(current);
            });
            star.addEventListener("mouseover", function () {
                render(index + 1);
            });
            star.addEventListener("mouseout", function () {
                render(current);
            });
        });

        // 所在 modal 關閉時重置評分
        var modal = container.closest(".modals");
        if (modal) {
            modal.addEventListener("close", function () {
                current = 0;
                render(0);
            });
        }
    });
});
