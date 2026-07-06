module.exports = function (eleventyConfig) {
    // 圖片直接複製到 dist/images
    eleventyConfig.addPassthroughCopy({ "src/images": "images" });

    // 元件 JS 逐一登記，複製到 dist/js
    eleventyConfig.addPassthroughCopy({
        "src/_includes/components/mobile-nav/mobile-nav.js": "js/mobile-nav.js",
        "src/_includes/components/footer/footer.js": "js/footer.js",
        "src/_includes/ui/modals/modals.js": "js/modals.js",
        "src/_includes/ui/checkbox/checkbox.js": "js/checkbox.js",
        "src/_includes/ui/accordion/accordion.js": "js/accordion.js",
        "src/_includes/ui/tab/tab.js": "js/tab.js",
        "src/_includes/ui/pagination/pagination.js": "js/pagination.js",
        "src/_includes/ui/multi-select/multi-select.js": "js/multi-select.js",
        "src/_includes/components/upload-box/upload-box.js": "js/upload-box.js",
        "src/_includes/components/editable-block/editable-block.js": "js/editable-block.js",
        "src/_includes/ui/toast/toast.js": "js/toast.js",
    });

    // 開發時 sass 另外編譯 dist/css，讓 eleventy --serve 監看 css 變動也即時重載
    eleventyConfig.setServerOptions({
        watch: ["dist/css/**/*.css"],
    });

    return {
        dir: {
            input: "src",
            output: "dist",
            includes: "_includes",
        },
        templateFormats: ["html", "njk"],
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk",
    };
};
