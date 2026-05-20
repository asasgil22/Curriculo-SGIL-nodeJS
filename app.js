const express = require('express');
const fs = require('fs');
const session = require('express-session');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'segredo-admin',
    resave: false,
    saveUninitialized: false
}));

function verificarAutenticacao(req, res, next) {
    if (req.session.logado) return next();
    res.redirect('/login');
}

app.get('/', (req, res) => {
    const dados = JSON.parse(fs.readFileSync('dados.json', 'utf8'));
    res.render('index', dados);
});

app.get('/login', (req, res) => res.render('login', { erro: null }));

app.post('/login', (req, res) => {
    if (req.body.usuario === 'admin' && req.body.senha === '123456') {
        req.session.logado = true;
        res.redirect('/admin');
    } else {
        res.render('login', { erro: 'Usuário ou senha incorretos!' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/admin', verificarAutenticacao, (req, res) => {
    const dados = JSON.parse(fs.readFileSync('dados.json', 'utf8'));
    res.render('admin', dados);
});

app.post('/admin', verificarAutenticacao, (req, res) => {
    const body = req.body;
    let dados = JSON.parse(fs.readFileSync('dados.json', 'utf8'));

    // Atualiza campos simples
    dados.nome = body.nome;
    dados.cargo = body.cargo;
    dados.email = body.email;
    dados.telefoneExibicao = body.telefoneExibicao;
    dados.telefoneLink = body.telefoneLink;
    dados.localizacao = body.localizacao;

    // Lógica das Tecnologias (Carrossel)
    if (body.tech_nome) {
        // Garante que é array mesmo se enviar apenas um item
        const nomes = Array.isArray(body.tech_nome) ? body.tech_nome : [body.tech_nome];
        const icones = Array.isArray(body.tech_icone) ? body.tech_icone : [body.tech_icone];
        
        dados.tecnologias = nomes.map((nome, i) => ({
            nome: nome,
            icone: icones[i]
        }));
    } else {
        dados.tecnologias = [];
    }

    // Atualiza JSONs
    try {
        dados.experiencias = JSON.parse(body.experiencias);
        dados.formacao = JSON.parse(body.formacao);
        dados.extracurricular = JSON.parse(body.extracurricular);
        dados.atuacao = JSON.parse(body.atuacao);
        dados.comportamental = JSON.parse(body.comportamental);
        dados.proficiencia = JSON.parse(body.proficiencia);
    } catch (err) {
        console.error("Erro ao salvar JSON:", err);
    }

    fs.writeFileSync('dados.json', JSON.stringify(dados, null, 2));
    res.redirect('/');
});

app.listen(3000, () => console.log('Servidor em http://localhost:3000'));