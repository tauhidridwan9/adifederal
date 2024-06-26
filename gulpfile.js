const gulp = require("gulp"),
  Fiber = require('fibers'),
  autoPrefixer = require("gulp-autoprefixer"),
  argv = require("minimist")(process.argv.slice(2)),
  browserSync = require("browser-sync").create(),
  reload = browserSync.reload,
  sass = require("gulp-sass"),
  cleanCSS = require("gulp-clean-css"),
  merge = require("gulp-merge-json"),
  csso = require("gulp-csso"),
  del = require("del"),
  gulpif = require("gulp-if"),
  sourcemaps = require("gulp-sourcemaps"),
  concat = require("gulp-concat"),
  imagemin = require("gulp-imagemin"),
  changed = require("gulp-changed"),
  rename = require("gulp-rename"),
  uglify = require("gulp-uglify"),
  beautify = require("gulp-beautify-code"),
  notify = require("gulp-notify"),
  plumber = require("gulp-plumber"),
  purgecss = require("gulp-purgecss"),
  nunjucks = require("gulp-nunjucks"),
  rendeNun = require("gulp-nunjucks-render"),
  data = require("gulp-data"),
  lineec = require("gulp-line-ending-corrector"),
  filter = require("gulp-filter");

sass.compiler = require('sass');

const destination = argv.clean ? "dist/demo/" : argv.pub ? "dist/publish/" : "dist/";
const port = argv.demo ? 4001 : argv.pub ? 4002 : 4000;

const sourcemap = argv.demo ? false : argv.pub ? true : true;
const minImg = argv.demo ? false : argv.pub ? true : false;

const path = {
  root: "./",
  temp: "./app/temp/",
  html: "./app/*.+(html|njk)",
  htmlElem: "./app/components/**/*.+(html|njk)",
  _partialFiles: "./app/partials/**/*.+(htm|njk)",
  _partial: "./app/partials/",
  php: "./app/php/**/*.php",
  fonts: "./app/fonts/**/*.*",
  js: "./app/js/*.*",
  scss: "./app/scss/**/*.scss",
  escScss: "!./app/scss/bootstrap/**.scss",
  img: "./app/image/**/*.+(png|jpg|gif|ico|svg|webp)",
  data: "./app/data/data.json",
  jsonAll: "./app/database/*.json",
  plugins: "./app/plugins/**/*.*",
  pluginCss: "./app/plugins/**/*.css",
  bootstrap: "node_modules/bootstrap/scss/**/*.scss",
  vendorJs: ["node_modules/jquery/dist/jquery.min.js", "node_modules/jquery-migrate/dist/jquery-migrate.min.js", "node_modules/bootstrap/dist/js/bootstrap.bundle.js"],
  pluginJs: "./app/plugins/**/*.js",
  plugin: { js: "./app/plugin/js/*.js", css: "./app/plugin/css/*.css" },
};

const dest = {
  css: destination + "css/",
  scss: destination + "scss/",
  js: destination + "js/",
  fonts: destination + "fonts/",
  php: destination + "php/",
  img: destination + "image/",
  plugins: destination + "plugins/",
  temp: destination + "temp/",
  elem: destination + "components/",
  bundle: { css: "bundled/css/", js: "bundled/js/" },
};

/* BrowserSync */
function browserReload(done) {
  browserSync.init({
    server: {
      baseDir: destination + "/",
    },
    port: port,
  });
  done();
}

/* CLEAN */
function clean() {
  return del([destination]);
}

/* Custom Notifier */
function customPlumber(errTitle) {
  return plumber({
    errorHandler: notify.onError({
      title: errTitle || "Error running Gulp",
      message: "Error: <%= error.message %>",
      sound: "Glass",
    }),
  });
}

/* HTML */
function htmlmain() {
  delete require.cache[require.resolve("./app/db.json")];
  return gulp.src([path.html])
    .pipe(data(require("./app/db.json")))
    .pipe(rendeNun({ path: [path._partial] }))
    .pipe(customPlumber("Error Running Nunjucks"))
    .pipe(beautify({ indent_size: 2, indent_char: " ", max_preserve_newlines: 0, unformatted: ["code", "pre", "em", "strong", "span", "i", "b", "br"] }))
    .pipe(gulp.dest(destination))
    .pipe(browserSync.reload({ stream: true }));
}

function htmlElem() {
  delete require.cache[require.resolve("./app/db.json")];
  return gulp.src([path.htmlElem])
    .pipe(data(require("./app/db.json")))
    .pipe(rendeNun({ path: [path._partial] }))
    .pipe(customPlumber("Error Running Nunjucks"))
    .pipe(beautify({ indent_size: 2, indent_char: " ", max_preserve_newlines: 0, unformatted: ["code", "pre", "em", "strong", "span", "i", "b", "br"] }))
    .pipe(gulp.dest(dest.elem))
    .pipe(browserSync.reload({ stream: true }));
}

function json() {
  return gulp.src([path.jsonAll])
    .pipe(merge({ fileName: "db.json" }))
    .pipe(gulp.dest("./app/"));
}

exports.html = htmlElem;
const html = gulp.series(json, gulp.parallel(htmlmain, htmlElem));

/* SCSS */
function css() {
  return gulp.src([path.scss, path.escScss])
    .pipe(gulpif(sourcemap, sourcemaps.init()))
    .pipe(sass({ includePaths: ['./node_modules'], fiber: Fiber }).on("error", sass.logError))
    .pipe(autoPrefixer())
    .pipe(gulpif(argv.demo, csso({ restructure: false, sourceMap: true, debug: true })))
    .pipe(gulpif(sourcemap, sourcemaps.write("./maps/")))
    .pipe(lineec())
    .pipe(gulp.dest(dest.css))
    .pipe(browserSync.reload({ stream: true }));
}

const scss = gulp.parallel(css);

/* Copy SCSS Folder */
function sassCopy() {
  return gulp.src([path.scss]).pipe(gulpif(argv.pub, gulp.dest(dest.scss)));
}

/* Image */
function image() {
  return gulp.src([path.img])
    .pipe(changed(dest.img))
    .pipe(gulp.dest(dest.img))
    .pipe(browserSync.reload({ stream: true }));
}

/* PHP */
function php() {
  return gulp.src([path.php])
    .pipe(changed(dest.php))
    .pipe(gulp.dest(dest.php))
    .pipe(browserSync.reload({ stream: true }));
}

/* Plugins */
function plugins() {
  return gulp.src([path.plugins])
    .pipe(changed(dest.plugins))
    .pipe(gulp.dest(dest.plugins))
    .pipe(browserSync.reload({ stream: true }));
}

/* Fonts */
function fonts() {
  return gulp.src([path.fonts])
    .pipe(changed(dest.fonts))
    .pipe(gulp.dest(dest.fonts))
    .pipe(browserSync.reload({ stream: true }));
}

/* Javascript */
function customscript() {
  return gulp.src([path.js])
    .pipe(changed(dest.js))
    .pipe(beautify())
    .pipe(lineec())
    .pipe(gulp.dest(dest.js));
}

function pluginscript() {
  return gulp.src(path.vendorJs, { allowEmpty: true })
    .pipe(concat("vendor.min.js"))
    .pipe(uglify())
    .pipe(gulp.dest(dest.js));
}

const javascript = gulp.parallel(customscript, pluginscript);

/* Watch Files */
function watchFiles() {
  gulp.watch(path.html, html);
  gulp.watch(path._partial, html);
  gulp.watch([path.plugin.js, path.pluginJs, path.js, path.fonts, path.img], copyAssets);
  gulp.watch([path.js], javascript);
  gulp.watch(path.scss, css);
  gulp.watch(path.root, gulp.series(clean, build));
}

const copyAssets = gulp.parallel(php, plugins, fonts, image);
const build = gulp.series(clean, html, gulp.parallel(scss, javascript, copyAssets));
const buildWatch = gulp.series(build, browserReload, gulp.parallel(watchFiles));

exports.html = html;
exports.browserReload = browserReload;
exports.scss = scss;
exports.clean = clean;
exports.javascript = javascript;
exports.build = build;
exports.buildWatch = buildWatch;
exports.watchFiles = watchFiles;
exports.default = buildWatch;
exports.copyAssets = copyAssets;
