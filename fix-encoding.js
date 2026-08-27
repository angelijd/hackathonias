const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Fix Email Ethereal
code = code.replace(
  /const testAccount = await nodemailer\.createTestAccount\(\);[\s\S]*?auth: \{ user: testAccount\.user, pass: testAccount\.pass \}\r?\n\s*\}\);/m,
  \"throw new Error('Ethereal desativado (502 Timeout)');\"
);

// Fix Email Subject and Body Encoding
code = code.replace(/Y\"\' Recuperaǜo de Acesso - Portal IAS/g, '🔑 Recuperação de Acesso - Portal IAS');
code = code.replace(/Olǭ /g, 'Olá ');
code = code.replace(/solicitaǜo de redefiniǜo/g, 'solicitação de redefinição');
code = code.replace(/sǜo:/g, 'são:');
code = code.replace(/Cdigo:/g, 'Código:');
code = code.replace(/Se vocǦ nǜo/g, 'Se você não');
code = code.replace(/Recuperaǜo/g, 'Recuperação');
code = code.replace(/Cdigo de Acesso:/g, 'Código de Acesso:');
code = code.replace(/segurana\./g, 'segurança.');

// Fix WhatsApp Encoding (line 1301)
code = code.replace(
  /const messageText = \.*\*Recupera.*Acesso - Portal IAS\*\\[\\s\\S]*?seguran.*a\.\;/m,
  \"const messageText = \\\🔑 *Recuperação de Acesso - Portal IAS*\\n\\nOlá *\\$\\{user.name\\}*,\\n\\nSuas credenciais são:\\n- *Código de Acesso:* \\$\\{user.code\\}\\n- *Senha:* \\$\\{user.password\\}\\n\\nGuarde essas credenciais com segurança.\\\;\"
);

fs.writeFileSync('server.ts', code, 'utf8');
