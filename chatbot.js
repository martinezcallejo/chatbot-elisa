const http  = require('http');
const https = require('https');

const GEMINI_API_KEY = 'AIzaSyDl5SRUk_ySl83vascpbQT0UWmnvTMCE_0';
const GEMINI_MODEL   = 'gemini-2.5-flash-lite-preview-06-17';
const PORT           = 3000;

const DEFAULT_SYSTEM = 'Eres el asistente virtual de Elisa GR, psicologa colegiada en Cadiz (AN-10174). Ayudas a los visitantes de psicologocadiz.es de forma calida y profesional. Responde siempre en espanol de forma concisa. Nunca des diagnosticos. Si detectas crisis grave, deriva al 112.';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', function(chunk) { body += chunk.toString(); });
    req.on('end', function() {
      try {
        const parsed = JSON.parse(body);
        const messages = parsed.messages || [];
        const systemPrompt = parsed.system || DEFAULT_SYSTEM;

        const contents = messages.map(function(m) {
          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          };
        });

        const payload = JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: contents,
          generationConfig: { maxOutputTokens: 800 }
        });

        const options = {
          hostname: 'generativelanguage.googleapis.com',
          path: '/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };

        const apiReq = https.request(options, function(apiRes) {
          let data = '';
          apiRes.on('data', function(chunk) { data += chunk; });
          apiRes.on('end', function() {
            try {
              const r = JSON.parse(data);
              const text = (r.candidates && r.candidates[0] && r.candidates[0].content && r.candidates[0].content.parts && r.candidates[0].content.parts[0] && r.candidates[0].content.parts[0].text)
                ? r.candidates[0].content.parts[0].text
                : 'Lo siento, no pude responder. Contacta con Elisa en el 722 599 226.';
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ reply: text }));
            } catch(e) {
              res.writeHead(500);
              res.end(JSON.stringify({ error: 'Error Gemini' }));
            }
          });
        });

        apiReq.on('error', function(e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        });
        apiReq.write(payload);
        apiReq.end();

      } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Peticion invalida' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, function() {
  console.log('Servidor en http://localhost:' + PORT);
});
