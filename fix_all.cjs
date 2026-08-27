const fs = require('fs');
const path = require('path');

const serverTsPath = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(serverTsPath, 'utf8');

// Fix the HTML block mojibake
const regexHtml = /<p>Cada funcionalidade tem uma hip[\s\S]*?onde o aluno est[^<]*<\/p>/;
const correctText = `<p>Cada funcionalidade tem uma hipótese pedagógica por trás. O bot de IA, por exemplo, não está aqui porque é tendência, e sim porque uma devolutiva que não gera conversa, tampouco gera mudança.</p>
              <h4 style="margin-top: 16px;">Se você avalia a pedagogia:</h4>
              <p>Cada escolha de apresentação é, também, pedagógica. Personalizar questões pelo hobby do aluno, por exemplo, não é entretenimento, mas como jovens se engajam mais. Já um relatório via WhatsApp não é apenas conveniência: a devolutiva tem mais valor e ação se chegar onde o aluno está.</p>`;

if (regexHtml.test(content)) {
  content = content.replace(regexHtml, correctText);
  console.log('Fixed HTML text');
}

// Fix TTS Route carefully using string splits to replace precisely
const parts = content.split("app.post('/api/tts', async (req, res) => {");
if (parts.length === 2) {
  const partsEnd = parts[1].split("app.get('/sandbox-live', (req, res) => {");
  if (partsEnd.length === 2) {
    const newTtsBlock = `
    try {
      const { text, isDynamic } = req.body;
      if (!text) return res.status(400).json({ error: 'Texto ausente' });

      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(text).digest('hex');
      const audioPath = path.join(process.cwd(), 'public', 'audio', hash + '.mp3');
      const audioUrl = '/audio/' + hash + '.mp3';

      const audioDir = path.dirname(audioPath);
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      if (fs.existsSync(audioPath)) {
        return res.json({ audioUrl });
      }

      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error('OPENAI_API_KEY is not set');
      }
      
      const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + openaiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'onyx',
          input: text
        })
      });

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        throw new Error('Falha na API da OpenAI: ' + errText);
      }

      const buffer = await ttsRes.arrayBuffer();
      fs.writeFileSync(audioPath, Buffer.from(buffer));

      return res.json({ audioUrl });
    } catch (error) {
      console.error('[TTS Error]:', error);
      res.status(500).json({ error: 'Falha na geracao de voz', details: error.message || error });
    }
  });

  `;
    content = parts[0] + "app.post('/api/tts', async (req, res) => {" + newTtsBlock + "app.get('/sandbox-live', (req, res) => {" + partsEnd[1];
    fs.writeFileSync(serverTsPath, content, 'utf8');
    console.log('Fixed TTS route and HTML.');
  }
}
