const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');
const yaml = require('js-yaml');

const TEMPLATES_PATH = './_templates';

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader('.'), {autoescape: false});
env.addGlobal(
  'includeFile',
  (src) => {
      return (
          fs.readFileSync(src, 'utf-8')
          // Substitute documentation links
          .replace(/\(\s*docs\/([^)]+\.md)\s*\)/gm, '($1)')
      );
  }
);

const templatePaths = fs.readdirSync(TEMPLATES_PATH).filter(s => s.endsWith('.md'));

for (const templatePath of templatePaths) {
    console.log(`Rendering ${templatePath}.`);

    const filePath = path.join(TEMPLATES_PATH, templatePath);

    let ctx = {};
    try {
        ctx = yaml.safeLoad(fs.readFileSync(filePath + '.yml'));
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }

    fs.writeFileSync(templatePath, env.render(filePath, ctx));
}
