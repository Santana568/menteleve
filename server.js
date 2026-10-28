const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PASTA = path.join(__dirname, 'data');
const ARQ = path.join(PASTA, 'db.json');

// ===== "banco de dados" em arquivo JSON =====
if (!fs.existsSync(PASTA)) fs.mkdirSync(PASTA);
if (!fs.existsSync(ARQ)) fs.writeFileSync(ARQ, JSON.stringify({ humores: [], mensagens: [], quiz: [] }));
const lerDB = () => JSON.parse(fs.readFileSync(ARQ, 'utf8'));
const salvarDB = db => fs.writeFileSync(ARQ, JSON.stringify(db, null, 2));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'))); // serve o front-end

// ===== rotas da API =====
app.get('/api/saude', (req, res) => res.json({ status: 'ok' }));

// humores
app.get('/api/humores', (req, res) => res.json(lerDB().humores));

app.post('/api/humores', (req, res) => {
  const nivel = Number(req.body.nivel);
  const nota = String(req.body.nota || '').trim().slice(0, 200);
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5)
    return res.status(400).json({ erro: 'nivel deve ser um inteiro de 1 a 5' });
  const db = lerDB();
  const registro = { id: Date.now(), nivel, nota, data: new Date().toISOString() };
  db.humores.push(registro);
  salvarDB(db);
  res.status(201).json(registro);
});

app.delete('/api/humores', (req, res) => {
  const db = lerDB();
  db.humores = [];
  salvarDB(db);
  res.status(204).end();
});

// estatísticas (usadas na página inicial)
app.get('/api/estatisticas', (req, res) => {
  const { humores } = lerDB();
  const total = humores.length;
  const media = total ? humores.reduce((s, r) => s + r.nivel, 0) / total : null;
  res.json({ total, media });
});

// mensagens do formulário de contato
app.post('/api/mensagens', (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim();
  const texto = String(req.body.texto || '').trim();
  if (nome.length < 2) return res.status(400).json({ erro: 'Informe seu nome.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' });
  if (texto.length < 10) return res.status(400).json({ erro: 'Mensagem muito curta.' });
  const db = lerDB();
  db.mensagens.push({ id: Date.now(), nome, email, assunto: String(req.body.assunto || ''), texto, data: new Date().toISOString() });
  salvarDB(db);
  res.status(201).json({ ok: true });
});

// resultados da autoavaliação
app.post('/api/quiz', (req, res) => {
  const total = Number(req.body.total);
  if (!Number.isInteger(total) || total < 0 || total > 15)
    return res.status(400).json({ erro: 'total deve ser de 0 a 15' });
  const db = lerDB();
  db.quiz.push({ total, data: new Date().toISOString() });
  salvarDB(db);
  res.status(201).json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

app.listen(PORT, () => console.log(`MenteLeve rodando em http://localhost:${PORT}`));
