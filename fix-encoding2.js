const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Fix Email Ethereal
code = code.replace(
  /const testAccount = await nodemailer\.createTestAccount\(\);[\s\S]*?auth: \{ user: testAccount\.user, pass: testAccount\.pass \}\r?\n\s*\}\);/g,
  "throw new Error('Ethereal desativado (502 Timeout)');"
);

// Fix WhatsApp encoding by matching the assignment exactly
code = code.replace(/const messageText = \[^\]*?\;/g, (match) => {
    if (match.includes('Recupera')) {
        return "const messageText = 🔑 *Recuperação de Acesso - Portal IAS*\\n\\nOlá **,\\n\\nSuas credenciais são:\\n- *Código de Acesso:* \\n- *Senha:* \\n\\nGuarde essas credenciais com segurança.;";
    }
    return match;
});

// Email HTML
code = code.replace(/subject: '.*Recupera.*Acesso - Portal IAS',/g, "subject: '🔑 Recuperação de Acesso - Portal IAS',");

fs.writeFileSync('server.ts', code, 'utf8');
