const fs = require('fs');
const path = require('path');

const serverTsPath = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(serverTsPath, 'utf8');

const ttsRouteOld = `      const audioPath = path.join(process.cwd(), 'public', 'audio', hash + '.mp3');
      const audioUrl = '/audio/' + hash + '.mp3';

      if (fs.existsSync(audioPath)) {
        return res.json({ audioUrl });
      }

      const openaiKey = process.env.OPENAI_API_KEY;`;

const ttsRouteNew = `      const audioPath = path.join(process.cwd(), 'public', 'audio', hash + '.mp3');
      const audioUrl = '/audio/' + hash + '.mp3';

      // Ensure directory exists
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
      }`;

if (content.includes(ttsRouteOld)) {
  content = content.replace(ttsRouteOld, ttsRouteNew);
  console.log('Fixed TTS route.');
} else {
  console.log('TTS route not found or already fixed.');
}

const catchOld = `    } catch (error) {
      console.error('[TTS Error]:', error);
      res.status(500).json({ error: 'Falha na geracao de voz' });
    }`;
const catchNew = `    } catch (error) {
      console.error('[TTS Error]:', error);
      res.status(500).json({ error: 'Falha na geracao de voz', details: error.message });
    }`;

if (content.includes(catchOld)) {
    content = content.replace(catchOld, catchNew);
    console.log('Fixed TTS catch block.');
} else {
    console.log('TTS catch block not found.');
}

fs.writeFileSync(serverTsPath, content, 'utf8');
console.log('Done.');
