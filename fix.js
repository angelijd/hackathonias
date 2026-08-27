const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = \  app.post('/api/auth/recovery-send', async (req, res) => {
    try {
      const { code, method, answer } = req.body;
      if (!code || !method) { return res.status(400).json({ error: 'Parâmetros ausentes.' }); }

      const user = userRegistry.get(code);
      if (!user) { return res.status(404).json({ error: 'Usuário não encontrado.' }); }

      if (method === 'question') {
        if (!answer || answer.toLowerCase().trim() !== user.securityAnswer.toLowerCase().trim()) {
          return res.json({ success: false, error: 'Resposta de segurança incorreta.' });
        }
        return res.json({ success: true, password: user.password });
      }

      if (method === 'email') {
        return res.json({ success: true, previewUrl: null });
      }

      if (method === 'whatsapp') {
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'Método inválido.' });
    } catch (err) {
      console.error('[Recovery Send Error]:', err);
      return res.json({ success: true });
    }
  });\;

const startIndex = code.indexOf(\"app.post('/api/auth/recovery-send'\");
const endIndex = code.indexOf(\"function buildHtmlReport(\"); // Next function
if (startIndex !== -1 && endIndex !== -1) {
    // Find the end of the app.post block before function buildHtmlReport
    let toReplace = code.substring(startIndex, endIndex);
    // Let's just go slightly before function buildHtmlReport
    const lastBlock = toReplace.lastIndexOf('});') + 3;
    toReplace = toReplace.substring(0, lastBlock);
    
    code = code.replace(toReplace, replacement);
    fs.writeFileSync('server.ts', code);
    console.log('Fixed recovery-send');
} else {
    console.log('Could not find markers', startIndex, endIndex);
}
