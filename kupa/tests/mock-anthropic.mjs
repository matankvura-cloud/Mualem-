// שרת-דמה של Claude Messages API (stream) לבדיקות. עונה בעברית עם הד להודעה
// האחרונה, ואם מוזכר "קייטרינג" מציע בקשת תשלום דרך הכלי.
import http from 'node:http';

export function startMockAnthropic(port = 4547) {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const body = await new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
    if (req.url !== '/v1/messages' || req.method !== 'POST') { res.writeHead(404); return res.end(); }
    const j = JSON.parse(body || '{}');
    calls.push({ headers: req.headers, body: j });
    const last = [...(j.messages || [])].reverse().find((m) => m.role === 'user');
    const text = typeof last?.content === 'string' ? last.content : '';
    const sys = Array.isArray(j.system) ? j.system.map((s) => s.text).join('\n') : String(j.system || '');
    const wantsTool = /קייטרינג/.test(text) && (j.tools || []).some((t) => t.name === 'suggest_payment_request');
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev('message_start', { message: { id: 'msg_mock', type: 'message', role: 'assistant', model: j.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } });
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    const reply = `זה עוזר דמה. שאלת: "${text}". ${/יתרה/.test(sys) ? 'אני רואה את היתרה בהקשר.' : ''}`;
    for (const chunk of reply.match(/.{1,12}/g) || []) ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: chunk } });
    ev('content_block_stop', { index: 0 });
    if (wantsTool) {
      ev('content_block_start', { index: 1, content_block: { type: 'tool_use', id: 'toolu_mock', name: 'suggest_payment_request', input: {} } });
      const input = JSON.stringify({ payee: 'קייטרינג שולחן ערוך', amount: 50, purpose: 'ארוחות לשבעה' });
      ev('content_block_delta', { index: 1, delta: { type: 'input_json_delta', partial_json: input.slice(0, 20) } });
      ev('content_block_delta', { index: 1, delta: { type: 'input_json_delta', partial_json: input.slice(20) } });
      ev('content_block_stop', { index: 1 });
    }
    ev('message_delta', { delta: { stop_reason: wantsTool ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 20 } });
    ev('message_stop', {});
    res.end();
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, calls, close: () => server.close() })));
}
