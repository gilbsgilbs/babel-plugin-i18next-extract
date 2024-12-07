/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");

const fs = require("fs-extra");
const yaml = require("js-yaml");
const nunjucks = require("nunjucks");
/* eslint-enable @typescript-eslint/no-require-imports */

const OUTPUT_PATH = "./_build";
const TEMPLATES_PATH = "./templates";
const ASSETS_PATH = "./assets";

// Remove and recreate output directory
fs.removeSync(OUTPUT_PATH);
try {
  fs.mkdirSync(OUTPUT_PATH);
} catch (err) {
  if (err.code !== "EEXIST") {
    throw err;
  }
}
fs.copySync(ASSETS_PATH, OUTPUT_PATH);

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader("."), {
  autoescape: false,
});
env.addGlobal("includeFile", (src, ctx) => {
  return env.renderString(
    fs
      .readFileSync(src, "utf-8")
      // Substitute documentation links
      .replace(
        /\(\s*https:\/\/i18next-extract\.netlify\.com\/(?:#\/)?([^)]+)\s*\)/gm,
        "($1)",
      )
      .replace(/\(\s*(?:\.\/|\/)?docs\/assets\/([^)]+)\s*\)/gm, "($1)"),
    ctx,
  );
});

const templatePaths = fs
  .readdirSync(TEMPLATES_PATH)
  .filter((s) => s.endsWith(".md") || s.endsWith(".html"));

for (const templatePath of templatePaths) {
  console.log(`Rendering ${templatePath}.`);

  const filePath = path.join(TEMPLATES_PATH, templatePath);

  let ctx = {};
  try {
    ctx = yaml.load(fs.readFileSync(filePath + ".yml"));
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  const tpl =
    "<!-- THIS FILE WAS GENERATED FROM A TEMPLATE. DO NOT EDIT IT MANUALLY. -->\n" +
    "<!-- Read CONTRIBUTING.md for more information. -->\n\n" +
    fs.readFileSync(filePath, "utf-8");
  fs.writeFileSync(
    path.join(OUTPUT_PATH, templatePath),
    env.renderString(tpl, ctx),
  );
}
