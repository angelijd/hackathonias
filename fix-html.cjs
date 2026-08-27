const fs = require('fs');

function updateFile(filePath, newTitle, newDesc) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/<title>.*?<\/title>/, '<title>' + newTitle + '</title>');
    content = content.replace(/<meta name="description" content=".*?" \/>/, '<meta name="description" content="' + newDesc + '" />');
    fs.writeFileSync(filePath, content, 'utf8');
}

updateFile('platforms_dist/SennaLogin/index.html', 'Login — Instituto Ayrton Senna', 'Portal de Login do Instituto Ayrton Senna');
updateFile('platforms_dist/Senna/index.html', 'Teste Senna — Instituto Ayrton Senna', 'Portal de Testes do Instituto Ayrton Senna');
updateFile('platforms_dist/autoavaliacao/index.html', 'Autoavaliação — Instituto Ayrton Senna', 'Portal de Autoavaliação do Instituto Ayrton Senna');

console.log('Done');
