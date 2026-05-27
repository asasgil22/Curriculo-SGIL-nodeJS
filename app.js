const express = require("express");
const fs = require("fs");
const session = require("express-session");
const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "chave_secreta_do_meu_site_123",
    resave: false,
    saveUninitialized: false,
  }),
);

function lerDados() {
  const dadosBrutos = fs.readFileSync("dados.json", "utf8");
  return JSON.parse(dadosBrutos);
}

function verificarAutenticacao(req, res, next) {
  if (req.session.logado) {
    next();
  } else {
    res.redirect("/login");
  }
}

// Rota leve para o monitoramento do UptimeRobot
app.get("/ping", (req, res) => {
  res.status(200).send("OK");
});

app.get("/", (req, res) => {
  const dados = lerDados();
  res.render("index", dados);
});

app.get("/login", (req, res) => {
  res.render("login", { erro: null });
});

app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;
  if (usuario === "admin" && senha === "123456") {
    req.session.logado = true;
    res.redirect("/admin");
  } else {
    res.render("login", { erro: "Usuário ou senha incorretos!" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/admin", verificarAutenticacao, (req, res) => {
  const dados = lerDados();
  res.render("admin", dados);
});

// PROCESSAMENTO DINÂMICO DO FORMULÁRIO DO ADMIN
app.post("/admin", verificarAutenticacao, (req, res) => {
  const {
    nome,
    email,
    cargo,
    telefoneExibicao,
    telefoneLink,
    localizacao,
    exp_periodo,
    exp_cargo,
    exp_empresa,
    exp_atividades,
  } = req.body;

  // Reconstrói o array de experiências recebido do formulário
  const experiencias = [];

  if (exp_periodo) {
    // Garante que os dados sejam tratados como arrays (mesmo se houver apenas 1 item cadastrado)
    const periodos = Array.isArray(exp_periodo) ? exp_periodo : [exp_periodo];
    const cargos = Array.isArray(exp_cargo) ? exp_cargo : [exp_cargo];
    const empresas = Array.isArray(exp_empresa) ? exp_empresa : [exp_empresa];
    const atividadesBrutas = Array.isArray(exp_atividades)
      ? exp_atividades
      : [exp_atividades];

    for (let i = 0; i < periodos.length; i++) {
      // Quebra o texto da Textarea por quebras de linha para gerar o array de atividades de volta
      const listaAtividades = atividadesBrutas[i]
        .split("\n")
        .map((linha) => linha.trim())
        .filter((linha) => linha.length > 0);

      experiencias.push({
        periodo: periodos[i],
        cargo: cargos[i],
        empresa: empresas[i],
        atividades: listaAtividades,
      });
    }
  }

  const novosDados = {
    nome,
    email,
    cargo,
    telefoneExibicao,
    telefoneLink,
    localizacao,
    experiencias, // injeta o novo array estruturado
  };

  fs.writeFileSync("dados.json", JSON.stringify(novosDados, null, 2));
  res.redirect("/");
});

app.listen(3000, () =>
  console.log("Servidor rodando em http://localhost:3000"),
);
