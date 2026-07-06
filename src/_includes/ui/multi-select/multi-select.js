// ui/multi-select：select2 多選（.multiSelect）的原生替代——標籤（可 × 移除）＋下拉複選（不關閉）＋搜尋過濾＋placeholder。
// 原生 <select multiple class="multiSelect"> 仍是唯一資料來源：所有互動最終都寫回 option.selected 並 dispatch change，
// 轉 React 時可直接對應 react-select（isMulti），value 陣列＝原生 select 目前選取的 options。
// 行為改寫自真實 app js/main.js 的 select2({ closeOnSelect: false, placeholder }) 設定，但完全不依賴 select2/jQuery。
document.addEventListener("DOMContentLoaded", function () {
    var selects = document.querySelectorAll("select.multiSelect[multiple]");

    selects.forEach(enhanceMultiSelect);

    function enhanceMultiSelect(select) {
        if (select.dataset.multiSelectEnhanced) return;
        select.dataset.multiSelectEnhanced = "true";

        var placeholder = select.dataset.placeholder || "請選擇";

        // 包一層 wrapper；原生 select 藏起來但留在 DOM 內，繼續當唯一資料來源
        var wrapper = document.createElement("div");
        wrapper.className = "multi-select";
        wrapper.title = placeholder;
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        select.classList.add("multi-select-native");
        select.setAttribute("aria-hidden", "true");
        select.setAttribute("tabindex", "-1");

        var control = document.createElement("div");
        control.className = "multi-select-control";

        var tagList = document.createElement("div");
        tagList.className = "multi-select-tags";

        var search = document.createElement("input");
        search.type = "text";
        search.className = "multi-select-search";
        search.autocomplete = "off";
        search.setAttribute("aria-label", placeholder);

        tagList.appendChild(search);
        control.appendChild(tagList);
        wrapper.appendChild(control);

        var dropdown = document.createElement("div");
        dropdown.className = "multi-select-dropdown";
        wrapper.appendChild(dropdown);

        function options() {
            return Array.prototype.slice.call(select.options);
        }

        function selectedOptions() {
            return options().filter(function (option) { return option.selected; });
        }

        function isOpen() {
            return wrapper.classList.contains("open");
        }

        function setOpen(open) {
            wrapper.classList.toggle("open", open);
            if (!open) {
                search.value = "";
                renderDropdown();
            }
        }

        // 下拉複選不關閉：選取/移除都透過寫回 option.selected + dispatch change，React 化時對應 onChange(value)
        function toggleOption(option) {
            option.selected = !option.selected;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            render();
            search.value = "";
            renderDropdown();
            search.focus();
        }

        function removeOption(option, event) {
            if (event) event.stopPropagation();
            option.selected = false;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            render();
        }

        function renderTags() {
            tagList.querySelectorAll(".multi-select-tag").forEach(function (tag) { tag.remove(); });

            var selected = selectedOptions();

            selected.forEach(function (option) {
                var tag = document.createElement("span");
                tag.className = "multi-select-tag";

                var label = document.createElement("span");
                label.className = "multi-select-tag-label";
                label.textContent = option.textContent;
                tag.appendChild(label);

                var remove = document.createElement("button");
                remove.type = "button";
                remove.className = "multi-select-tag-remove";
                remove.setAttribute("aria-label", "移除 " + option.textContent);
                remove.textContent = "×";
                remove.addEventListener("click", function (event) { removeOption(option, event); });
                tag.appendChild(remove);

                tagList.insertBefore(tag, search);
            });

            // 對應真實 app main.js：有選取時搜尋框縮窄、不顯示 placeholder；無選取時全寬顯示 placeholder
            wrapper.classList.toggle("has-tags", selected.length > 0);
            search.placeholder = selected.length > 0 ? "" : placeholder;
        }

        function renderDropdown() {
            dropdown.innerHTML = "";
            var keyword = search.value.trim().toLowerCase();

            options().forEach(function (option) {
                var text = option.textContent;
                if (keyword && text.toLowerCase().indexOf(keyword) === -1) return;

                var item = document.createElement("div");
                item.className = "multi-select-option" + (option.selected ? " selected" : "");
                item.textContent = text;
                item.addEventListener("click", function () { toggleOption(option); });
                dropdown.appendChild(item);
            });

            if (!dropdown.children.length) {
                var empty = document.createElement("div");
                empty.className = "multi-select-option-empty";
                empty.textContent = "無符合選項";
                dropdown.appendChild(empty);
            }
        }

        function render() {
            renderTags();
            renderDropdown();
        }

        control.addEventListener("click", function () {
            setOpen(true);
            search.focus();
        });

        search.addEventListener("focus", function () {
            setOpen(true);
        });

        search.addEventListener("input", function () {
            renderDropdown();
        });

        search.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setOpen(false);
                search.blur();
            } else if (event.key === "Backspace" && search.value === "") {
                var selected = selectedOptions();
                var last = selected[selected.length - 1];
                if (last) removeOption(last);
            }
        });

        document.addEventListener("click", function (event) {
            if (!wrapper.contains(event.target)) setOpen(false);
        });

        render();
    }
});
