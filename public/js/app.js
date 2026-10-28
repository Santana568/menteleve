// ===== utilitários =====
const $ = id => document.getElementById(id);
// chamada à API REST (mesma origem do site)
async function api(rota, opcoes = {}) {
  const r = await fetch('/api' + rota, { headers: { 'Content-Type': 'application/json' }, ...opcoes });
  if (r.status === 204) return null;
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || 'Erro na API');
  return dados;
}
const EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];

// marca o link ativo no menu
const pagina = document.body.dataset.pagina;
document.querySelectorAll('nav a').forEach(a => { if (a.dataset.p === pagina) a.classList.add('ativo'); });

// ===== início: estatísticas =====
async function iniciarInicio() {
  try {
    const { total, media } = await api('/estatisticas');
    $('totalRegs').textContent = total;
    if (media) $('mediaHumor').textContent = media.toFixed(1);
  } catch { /* servidor indisponível: mantém valores padrão */ }
}

// ===== diário de humor =====
function iniciarHumor() {
  let nivel = 0;
  const box = $('humores');
  EMOJIS.forEach((e, i) => {
    const b = document.createElement('button');
    b.textContent = e;
    b.setAttribute('aria-label', 'Humor ' + (i + 1));
    b.onclick = () => {
      nivel = i + 1;
      box.querySelectorAll('button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    };
    box.appendChild(b);
  });

  $('salvar').onclick = async () => {
    if (!nivel) { $('msg').textContent = 'Escolha um humor.'; $('msg').className = 'erro'; return; }
    try {
      await api('/humores', { method: 'POST', body: JSON.stringify({ nivel, nota: $('nota').value.trim() }) });
      $('nota').value = '';
      $('msg').textContent = 'Registro salvo!'; $('msg').className = 'ok';
      desenhar();
    } catch (e) { $('msg').textContent = e.message; $('msg').className = 'erro'; }
  };
  $('limpar').onclick = async () => {
    if (confirm('Apagar todo o histórico?')) { await api('/humores', { method: 'DELETE' }); desenhar(); }
  };

  async function desenhar() {
    let regs = [];
    try { regs = await api('/humores'); }
    catch { $('lista').textContent = 'Não foi possível carregar os registros.'; return; }
    // lista (mais recentes primeiro)
    $('lista').innerHTML = regs.length
      ? regs.slice().reverse().map(r =>
          `<div class="reg"><span>${EMOJIS[r.nivel - 1]} ${new Date(r.data).toLocaleString('pt-BR')}</span><span>${r.nota.replace(/</g, '&lt;')}</span></div>`).join('')
      : 'Nenhum registro ainda.';
    // gráfico em canvas
    const c = $('grafico'), g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    const ult = regs.slice(-7), pad = 30;
    g.strokeStyle = '#8aa'; g.fillStyle = '#8aa'; g.font = '12px sans-serif';
    for (let n = 1; n <= 5; n++) {
      const y = c.height - pad - (n - 1) * (c.height - 2 * pad) / 4;
      g.beginPath(); g.moveTo(pad, y); g.lineTo(c.width - 10, y); g.globalAlpha = .25; g.stroke(); g.globalAlpha = 1;
      g.fillText(n, 10, y + 4);
    }
    if (!ult.length) return;
    const dx = ult.length > 1 ? (c.width - pad - 20) / (ult.length - 1) : 0;
    g.strokeStyle = '#2a9d8f'; g.lineWidth = 3; g.beginPath();
    ult.forEach((r, i) => {
      const x = pad + 10 + i * dx, y = c.height - pad - (r.nivel - 1) * (c.height - 2 * pad) / 4;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    ult.forEach((r, i) => {
      const x = pad + 10 + i * dx, y = c.height - pad - (r.nivel - 1) * (c.height - 2 * pad) / 4;
      g.fillStyle = '#2a9d8f'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
    });
  }
  desenhar();
}

// ===== respiração guiada =====
function iniciarRespiracao() {
  const fases = [
    { txt: 'Inspire', seg: 4, escala: 1.5 },
    { txt: 'Segure', seg: 4, escala: 1.5 },
    { txt: 'Expire', seg: 6, escala: 1 }
  ];
  let timer = null, ciclos = 0;
  const circ = $('circulo'), btn = $('iniciar');

  function rodar(i = 0) {
    const f = fases[i];
    circ.textContent = f.txt;
    circ.style.transitionDuration = f.seg + 's';
    circ.style.transform = `scale(${f.escala})`;
    timer = setTimeout(() => {
      if (i === fases.length - 1) { ciclos++; $('ciclos').textContent = ciclos; }
      rodar((i + 1) % fases.length);
    }, f.seg * 1000);
  }
  btn.onclick = () => {
    if (timer) {
      clearTimeout(timer); timer = null;
      circ.textContent = 'Pronto?'; circ.style.transform = 'scale(1)';
      btn.textContent = 'Iniciar';
    } else { rodar(); btn.textContent = 'Parar'; }
  };
}

// ===== autoavaliação =====
function iniciarQuiz() {
  const perguntas = [
    'Tive pouco interesse ou prazer em fazer as coisas',
    'Me senti para baixo ou sem esperança',
    'Tive dificuldade para dormir ou dormi demais',
    'Me senti nervoso(a) ou ansioso(a)',
    'Não consegui parar ou controlar preocupações'
  ];
  const opcoes = ['Nunca', 'Alguns dias', 'Mais da metade dos dias', 'Quase todos os dias'];
  $('quiz').innerHTML = perguntas.map((p, i) =>
    `<div class="opcoes"><strong>${i + 1}. ${p}</strong>` +
    opcoes.map((o, v) => `<label><input type="radio" name="q${i}" value="${v}" style="width:auto;margin:0 8px 0 0">${o}</label>`).join('') +
    '</div>').join('') + '<button class="btn" id="enviarQuiz">Ver resultado</button> <span id="erroQuiz" class="erro"></span>';

  $('enviarQuiz').onclick = () => {
    let total = 0;
    for (let i = 0; i < perguntas.length; i++) {
      const r = document.querySelector(`input[name="q${i}"]:checked`);
      if (!r) { $('erroQuiz').textContent = 'Responda todas as perguntas.'; return; }
      total += Number(r.value);
    }
    $('erroQuiz').textContent = '';
    let msg;
    if (total <= 4) msg = 'Seus sinais parecem leves. Continue cuidando de si com sono, movimento e conversas.';
    else if (total <= 9) msg = 'Há alguns sinais de desconforto. Vale conversar com alguém de confiança e acompanhar seu humor.';
    else msg = 'Seus sinais estão mais intensos. Considere procurar um profissional de saúde ou o CVV (188).';
    const res = $('resultado');
    res.style.display = 'block';
    res.innerHTML = `<h2>Pontuação: ${total}/15</h2><p>${msg}</p>`;
    api('/quiz', { method: 'POST', body: JSON.stringify({ total }) }).catch(() => {});
  };
}

// ===== apoio: validação do formulário =====
function iniciarApoio() {
  $('form').addEventListener('submit', async e => {
    e.preventDefault();
    const nome = $('nome').value.trim(), email = $('email').value.trim(), texto = $('texto').value.trim();
    const r = $('retorno');
    if (nome.length < 2) { r.textContent = 'Informe seu nome.'; r.className = 'erro'; return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { r.textContent = 'E-mail inválido.'; r.className = 'erro'; return; }
    if (texto.length < 10) { r.textContent = 'Mensagem muito curta.'; r.className = 'erro'; return; }
    try {
      await api('/mensagens', { method: 'POST', body: JSON.stringify({ nome, email, assunto: $('assunto').value, texto }) });
      r.textContent = 'Mensagem enviada. Obrigado!'; r.className = 'ok';
      $('form').reset();
    } catch (err) { r.textContent = err.message; r.className = 'erro'; }
  });
}

// ===== roteador por página =====
({ inicio: iniciarInicio, humor: iniciarHumor, respiracao: iniciarRespiracao, quiz: iniciarQuiz, apoio: iniciarApoio })[pagina]?.();
