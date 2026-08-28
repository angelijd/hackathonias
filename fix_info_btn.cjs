const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, 'public', 'a11y', 'accessibility.js');
let jsContent = fs.readFileSync(jsPath, 'utf8');

// Use regex to remove the button line safely regardless of emoji
jsContent = jsContent.replace(
  /<button class="ias-a11y-btn" id="ias-btn-info-menu">.*?Fundamenta.*?<\/button>/g,
  ""
);

fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log('Fixed info menu button removal.');
