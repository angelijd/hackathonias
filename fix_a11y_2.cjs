const fs = require('fs');
const path = require('path');

const a11yPath = path.join(__dirname, 'public', 'a11y', 'accessibility.js');
let content = fs.readFileSync(a11yPath, 'utf8');

// Insert the condition at the top of DOMContentLoaded
if (!content.includes('var isOpeningScreen')) {
    content = content.replace(
        "document.addEventListener('DOMContentLoaded', function() {",
        "document.addEventListener('DOMContentLoaded', function() {\n  var isOpeningScreen = window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/index.html' || window.location.pathname === '';"
    );
}

// Replace each appendChild individually
content = content.replace(
    "document.body.appendChild(widget);",
    "if (isOpeningScreen) { document.body.appendChild(widget); }"
);
content = content.replace(
    "document.body.appendChild(infoWidget);",
    "if (isOpeningScreen) { document.body.appendChild(infoWidget); }"
);
content = content.replace(
    "document.body.appendChild(menu);",
    "if (isOpeningScreen) { document.body.appendChild(menu); }"
);
content = content.replace(
    "document.body.appendChild(backdrop);",
    "if (isOpeningScreen) { document.body.appendChild(backdrop); }"
);

fs.writeFileSync(a11yPath, content, 'utf8');
console.log('Successfully updated accessibility.js.');
