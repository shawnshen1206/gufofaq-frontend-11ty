// 語言切換（runtime 就地切換，不動網址、不重整）：
// 點 .js-lang-toggle 在 繁中↔英文 間切換 —— 把所有 [data-i18n] 的文字換成該語言、
// 需翻譯的屬性走 data-i18n-placeholder / data-i18n-title / data-i18n-aria-label、寫 localStorage、設 <html lang>。
// 繁中為預設，其文字＝markup 原文（就地擷取，不需 zh 字典）；英文來自 ./i18n/en.json（被 JS fetch 的資產）。
// 轉 React：<a data-i18n="key">文字</a> → {t("key")}，同一份 key 餵 next-intl；本檔的 runtime swap 不帶過去。
(function () {
    var DEFAULT = "zh-Hant";
    var root = document.documentElement;
    var enDict = null;
    var defaults = { text: {}, attr: {} };
    var ATTRS = ["placeholder", "title", "aria-label"];

    function collectDefaults() {
        document.querySelectorAll("[data-i18n]").forEach(function (el) {
            defaults.text[el.getAttribute("data-i18n")] = el.textContent;
        });
        ATTRS.forEach(function (a) {
            document.querySelectorAll("[data-i18n-" + a + "]").forEach(function (el) {
                var k = el.getAttribute("data-i18n-" + a);
                (defaults.attr[a] = defaults.attr[a] || {})[k] = el.getAttribute(a);
            });
        });
    }

    function pick(key, lang) {
        if (lang === "en" && enDict && enDict[key] != null) return enDict[key];
        return null; // 回繁中時用 defaults
    }

    function apply(lang) {
        document.querySelectorAll("[data-i18n]").forEach(function (el) {
            var k = el.getAttribute("data-i18n");
            var v = pick(k, lang);
            el.textContent = v != null ? v : defaults.text[k];
        });
        ATTRS.forEach(function (a) {
            document.querySelectorAll("[data-i18n-" + a + "]").forEach(function (el) {
                var k = el.getAttribute("data-i18n-" + a);
                var v = pick(k, lang);
                el.setAttribute(a, v != null ? v : (defaults.attr[a] || {})[k]);
            });
        });
        root.setAttribute("lang", lang === "en" ? "en" : "zh-Hant");
        document.querySelectorAll(".js-lang-toggle").forEach(function (b) {
            b.textContent = lang === "en" ? "繁中" : "EN";
        });
    }

    function current() {
        return root.getAttribute("lang") === "en" ? "en" : DEFAULT;
    }

    function withEn(cb) {
        if (enDict) return cb();
        fetch("./i18n/en.json")
            .then(function (r) { return r.json(); })
            .then(function (d) { enDict = d; cb(); })
            .catch(function () { cb(); });
    }

    document.addEventListener("DOMContentLoaded", function () {
        collectDefaults();
        var saved = null;
        try { saved = localStorage.getItem("lang"); } catch (e) { }
        if (saved === "en") withEn(function () { apply("en"); });
        else apply(DEFAULT);

        document.querySelectorAll(".js-lang-toggle").forEach(function (btn) {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                var next = current() === "en" ? DEFAULT : "en";
                try { localStorage.setItem("lang", next); } catch (e2) { }
                if (next === "en") withEn(function () { apply("en"); });
                else apply(DEFAULT);
            });
        });
    });
})();
