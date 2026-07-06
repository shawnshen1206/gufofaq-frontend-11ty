module.exports = function (eleventyConfig) {
    // 圖片直接複製到 dist/images
    eleventyConfig.addPassthroughCopy({ "src/images": "images" });

    // 元件 JS 逐一登記，複製到 dist/js
    eleventyConfig.addPassthroughCopy({
        "src/_includes/components/mobile-nav/mobile-nav.js": "js/mobile-nav.js",
        "src/_includes/components/footer/footer.js": "js/footer.js",
        "src/_includes/ui/modals/modals.js": "js/modals.js",
        "src/_includes/ui/checkbox/checkbox.js": "js/checkbox.js",
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
