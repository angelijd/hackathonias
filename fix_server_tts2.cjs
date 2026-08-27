const fs = require('fs');
const path = require('path');

const serverTsPath = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(serverTsPath, 'utf8');

const ttsRouteOld = `  app.post('/api/tts', async (req, res) => {
    try {
      const { text, isDynamic } = req.body;
      if (!text) return res.status(400).json({ error: 'Texto ausente' });

      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(text).digest('hex');
      const audioPath = path.join(process.cwd(), 'public', 'audio', hash + '.mp3');
      const audioUrl = '/audio/' + hash + '.mp3';

      if (fs.existsSync(audioPath)) {
        return res.json({ audioUrl });
      }

      const openaiKey = process.env.OPENAI_API_KEY;
      
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
        throw new Error('Falha na API da OpenAI');
      }

      const buffer = await ttsRes.arrayBuffer();
      fs.writeFileSync(audioPath, Buffer.from(buffer));

      return res.json({ audioUrl });
    } catch (error) {
      console.error('[TTS Error]:', error);
      res.status(500).json({ error: 'Falha na geracao de voz' });
    }
  });`;

const ttsRouteNew = `  app.post('/api/tts', async (req, res) => {
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
        throw new Error('OPENAI_API_KEY is not set in environment variables');
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
  });`;

if (content.includes(ttsRouteOld)) {
  content = content.replace(ttsRouteOld, ttsRouteNew);
  fs.writeFileSync(serverTsPath, content, 'utf8');
  console.log('Fixed TTS route successfully.');
} else {
  // Let's try to match with regex just in case there are minor whitespace differences
  const regex = /app\.post\('\/api\/tts',[\s\S]*?\}\);/m;
  if (regex.test(content)) {
    content = content.replace(regex, ttsRouteNew);
    fs.writeFileSync(serverTsPath, content, 'utf8');
    console.log('Fixed TTS route via regex fallback.');
  } else {
    console.log('TTS route still not found. Regex failed.');
  }
}
