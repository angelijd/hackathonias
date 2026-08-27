const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'public', 'a11y', 'accessibility.css');
let content = fs.readFileSync(cssPath, 'utf8');

// #ias-a11y-widget
content = content.replace(
  /#ias-a11y-widget {\n  position: fixed;\n  bottom: 25px;\n  right: 25px;/g,
  '#ias-a11y-widget {\n  position: fixed;\n  bottom: 25px;\n  left: 25px;'
);

// #ias-info-widget
content = content.replace(
  /#ias-info-widget {\n  position: fixed;\n  bottom: 25px;\n  right: 90px;/g,
  '#ias-info-widget {\n  position: fixed;\n  bottom: 25px;\n  left: 90px;'
);

// #ias-a11y-menu
content = content.replace(
  /#ias-a11y-menu {\n  position: fixed;\n  bottom: 90px;\n  right: 25px;/g,
  '#ias-a11y-menu {\n  position: fixed;\n  bottom: 90px;\n  left: 25px;'
);

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Fixed CSS positioning.');
