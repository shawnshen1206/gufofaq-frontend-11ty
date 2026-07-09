// ui/multi-select：select2 多選（.multiSelect）的原生替代——標籤（可 × 移除）＋下拉複選（不關閉）＋搜尋過濾＋placeholder。
// 原生 <select multiple class="multiSelect"> 仍是唯一資料來源：所有互動最終都寫回 option.selected 並 dispatch change，
// 轉 React 時可直接對應 react-select（isMulti），value 陣列＝原生 select 目前選取的 options。
// 行為改寫自真實 app js/main.js 的 select2({ closeOnSelect: false, placeholder }) 設定，但完全不依賴 select2/jQuery。
//
// a11y：原生 select 被移出無障礙樹（aria-hidden + tabindex=-1），故自訂控制項必須自己補回完整語意與鍵盤操作——
//   搜尋框 = role=combobox（aria-expanded / aria-controls / aria-activedescendant），下拉 = role=listbox（aria-multiselectable），
//   選項 = role=option（aria-selected）。鍵盤：↑↓ 移動、Enter/Space 選取、Esc 關閉、Home/End 跳首尾、Backspace 移除最後一個標籤。
// i18n：placeholder／空狀態／移除鈕標籤由 JS 產生，故走 GufoI18n.t(key, 繁中原文)，並在 gufo:langchange 時重畫。
document.addEventListener("DOMContentLoaded", function () {
    var uid = 0;

    function t(key, zh) {
        return (window.GufoI18n && window.GufoI18n.t) ? window.GufoI18n.t(key, zh) : zh;
    }

    document.querySelectorAll("select.multiSelect[multiple]").forEach(enhanceMultiSelect);

    function enhanceMultiSelect(select) {
        if (select.dataset.multiSelectEnhanced) return;
        select.dataset.multiSelectEnhanced = "true";

        var id = "ms-" + (++uid);
        function placeholder() {
            // 有 data-placeholder-key 就走 i18n（data-placeholder 當繁中原文的 fallback）；否則原字串照用
            var zh = select.dataset.placeholder;
            var key = select.dataset.placeholderKey;
            if (key) return t(key, zh || "");
            return zh || t("common.pleaseSelect", "請選擇");
        }

        // 包一層 wrapper；原生 select 藏起來但留在 DOM 內，繼續當唯一資料來源
        var wrapper = document.createElement("div");
        wrapper.className = "multi-select";
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        select.classList.add("multi-select-native");
        select.setAttribute("aria-hidden", "true");
        select.setAttribute("tabindex", "-1");

        var control = document.createElement("div");
        control.className = "multi-select-control";

        var tagList = document.createElement("div");
        tagList.className = "multi-select-tags";

        var dropdown = document.createElement("div");
        dropdown.className = "multi-select-dropdown";
        dropdown.id = id + "-listbox";
        dropdown.setAttribute("role", "listbox");
        dropdown.setAttribute("aria-multiselectable", "true");

        var search = document.createElement("input");
        search.type = "text";
        search.className = "multi-select-search";
        search.autocomplete = "off";
        search.setAttribute("role", "combobox");
        search.setAttribute("aria-haspopup", "listbox");
        search.setAttribute("aria-autocomplete", "list");
        search.setAttribute("aria-controls", dropdown.id);
        search.setAttribute("aria-expanded", "false");

        tagList.appendChild(search);
        control.appendChild(tagList);
        wrapper.appendChild(control);
        wrapper.appendChild(dropdown);

        var activeIndex = -1; // 鍵盤游標位置（對應 dropdown 內第幾個 role=option）

        function options() { return Array.prototype.slice.call(select.options); }
        function selectedOptions() { return options().filter(function (o) { return o.selected; }); }
        function items() { return Array.prototype.slice.call(dropdown.querySelectorAll(".multi-select-option")); }

        function setOpen(open) {
            wrapper.classList.toggle("open", open);
            search.setAttribute("aria-expanded", open ? "true" : "false");
            if (!open) {
                search.value = "";
                activeIndex = -1;
                search.removeAttribute("aria-activedescendant");
                renderDropdown();
            }
        }
        function isOpen() { return wrapper.classList.contains("open"); }

        function setActive(index) {
            var list = items();
            if (!list.length) { activeIndex = -1; search.removeAttribute("aria-activedescendant"); return; }
            activeIndex = Math.max(0, Math.min(index, list.length - 1));
            list.forEach(function (el, i) { el.classList.toggle("active", i === activeIndex); });
            var el = list[activeIndex];
            search.setAttribute("aria-activedescendant", el.id);
            if (el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
        }

        // 下拉複選不關閉：選取/移除都透過寫回 option.selected + dispatch change，React 化時對應 onChange(value)
        function toggleOption(option) {
            option.selected = !option.selected;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            search.value = "";
            render();
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
                remove.setAttribute("aria-label", t("action.remove", "移除") + " " + option.textContent);
                remove.textContent = "×";
                remove.addEventListener("click", function (event) { removeOption(option, event); });
                tag.appendChild(remove);

                tagList.insertBefore(tag, search);
            });

            // 對應真實 app main.js：有選取時搜尋框縮窄、不顯示 placeholder；無選取時全寬顯示 placeholder
            wrapper.classList.toggle("has-tags", selected.length > 0);
            var ph = placeholder();
            search.placeholder = selected.length > 0 ? "" : ph;
            search.setAttribute("aria-label", ph);
            wrapper.title = ph;
        }

        function renderDropdown() {
            dropdown.innerHTML = "";
            var keyword = search.value.trim().toLowerCase();
            var n = 0;

            options().forEach(function (option) {
                var text = option.textContent;
                if (keyword && text.toLowerCase().indexOf(keyword) === -1) return;

                var item = document.createElement("div");
                item.className = "multi-select-option" + (option.selected ? " selected" : "");
                item.id = id + "-opt-" + (n++);
                item.setAttribute("role", "option");
                item.setAttribute("aria-selected", option.selected ? "true" : "false");
                item.textContent = text;
                item.addEventListener("click", function () { toggleOption(option); });
                dropdown.appendChild(item);
            });

            if (!n) {
                var empty = document.createElement("div");
                empty.className = "multi-select-option-empty";
                empty.textContent = t("common.noMatchingOptions", "無符合選項");
                dropdown.appendChild(empty);
            }
            // 過濾後重新對位游標（避免指向已消失的選項）
            if (activeIndex >= 0) setActive(activeIndex);
        }

        function render() { renderTags(); renderDropdown(); }

        control.addEventListener("click", function () { setOpen(true); search.focus(); });
        search.addEventListener("focus", function () { setOpen(true); });
        search.addEventListener("input", function () { activeIndex = -1; renderDropdown(); });

        search.addEventListener("keydown", function (event) {
            var list = items();
            switch (event.key) {
                case "ArrowDown":
                    event.preventDefault();
                    if (!isOpen()) setOpen(true);
                    setActive(activeIndex < 0 ? 0 : activeIndex + 1);
                    break;
                case "ArrowUp":
                    event.preventDefault();
                    if (!isOpen()) setOpen(true);
                    setActive(activeIndex <= 0 ? list.length - 1 : activeIndex - 1);
                    break;
                case "Home":
                    if (isOpen() && list.length) { event.preventDefault(); setActive(0); }
                    break;
                case "End":
                    if (isOpen() && list.length) { event.preventDefault(); setActive(list.length - 1); }
                    break;
                case "Enter":
                case " ":
                    // 空白鍵在有輸入內容時應照常打字，只有游標停在選項上才視為「選取」
                    if (isOpen() && activeIndex >= 0 && list[activeIndex] && (event.key === "Enter" || search.value === "")) {
                        event.preventDefault();
                        list[activeIndex].click();
                    }
                    break;
                case "Escape":
                    setOpen(false);
                    search.blur();
                    break;
                case "Backspace":
                    if (search.value === "") {
                        var selected = selectedOptions();
                        var last = selected[selected.length - 1];
                        if (last) removeOption(last);
                    }
                    break;
            }
        });

        document.addEventListener("click", function (event) {
            if (!wrapper.contains(event.target)) setOpen(false);
        });

        // 切換語言後重畫 JS 產生的字串（placeholder / 空狀態 / 移除鈕標籤）
        document.addEventListener("gufo:langchange", render);

        render();
    }
});
