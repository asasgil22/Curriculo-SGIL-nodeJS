require("dotenv").config();
const express = require("express");
const fs = require("fs");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); // Permite acessar imagens e arquivos públicos

// Configuração do Multer para upload da foto
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./public/uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }); // Cria a pasta se não existir
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, "foto-perfil-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB para uploads
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Apenas imagens são permitidas!"));
  },
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "chave_secreta_do_meu_site_123",
    resave: false,
    saveUninitialized: false,
  }),
);

function lerDados() {
  try {
    let dados = {};
    if (fs.existsSync("dados.json")) {
      const dadosBrutos = fs.readFileSync("dados.json", "utf8");
      dados = JSON.parse(dadosBrutos);
    }

    // Previne que a página quebre garantindo propriedades essenciais
    dados.nome = dados.nome || "";
    dados.email = dados.email || "";
    dados.cargo = dados.cargo || "";
    dados.telefoneExibicao = dados.telefoneExibicao || "";
    dados.telefoneLink = dados.telefoneLink || "";
    dados.localizacao = dados.localizacao || "";

    dados.tecnologias = dados.tecnologias || [];
    dados.estatisticas = dados.estatisticas || [];
    dados.proficiencia = dados.proficiencia || [];
    dados.formacao = dados.formacao || [];
    dados.extracurricular = dados.extracurricular || [];
    dados.experiencias = dados.experiencias || [];
    dados.atuacao = dados.atuacao || [];
    dados.comportamental = dados.comportamental || [];

    return dados;
  } catch (erro) {
    console.error("Erro ao ler dados.json:", erro);
    return {
      tecnologias: [],
      estatisticas: [],
      proficiencia: [],
      formacao: [],
      extracurricular: [],
      experiencias: [],
      atuacao: [],
      comportamental: [],
    };
  }
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
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "123456";

  if (usuario === adminUser && senha === adminPass) {
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
app.post("/admin", verificarAutenticacao, upload.single("foto"), (req, res) => {
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

  // Lê os dados atuais para não perder a foto se o usuário não fizer um novo upload
  const dadosAtuais = lerDados();
  let caminhoFoto = dadosAtuais.foto || "";
  if (req.file) {
    caminhoFoto = "/uploads/" + req.file.filename;
  }

  const novosDados = {
    ...dadosAtuais, // Mantém os dados antigos que não são editados no form (ex: tecnologias)
    nome,
    email,
    cargo,
    telefoneExibicao,
    telefoneLink,
    localizacao,
    foto: caminhoFoto,
    experiencias, // injeta o novo array estruturado
  };

  fs.writeFileSync("dados.json", JSON.stringify(novosDados, null, 2));
  res.redirect("/");
});

app.listen(3000, () =>
  console.log("Servidor rodando em http://localhost:3000"),
);
