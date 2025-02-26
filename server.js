import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Carregar dados das carnes
const carnesData = JSON.parse(
  await fs.readFile(join(__dirname, 'dados_carnes.json'), 'utf-8')
);

// Critérios para diferentes objetivos
const objetivos = {
  hipertrofia: {
    proteinas: { min: 25, peso: 2 },
    calorias: { min: 150, peso: 1 },
    gorduras_totais: { max: 15, peso: -1 }
  },
  emagrecimento: {
    calorias: { max: 200, peso: -2 },
    proteinas: { min: 20, peso: 1.5 },
    gorduras_totais: { max: 10, peso: -1.5 }
  },
  equilibrada: {
    proteinas: { min: 20, peso: 1 },
    gorduras_totais: { ideal: 10, peso: 1 },
    calorias: { ideal: 200, peso: 1 }
  }
};

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/api/carnes', (req, res) => {
  res.json(carnesData);
});

app.get('/api/ranking/:nutriente', (req, res) => {
  const { nutriente } = req.params;
  const { ordem } = req.query;

  if (!Object.keys(carnesData[Object.keys(carnesData)[0]]).includes(nutriente)) {
    return res.status(400).json({ error: 'Nutriente inválido' });
  }

  const ranking = Object.entries(carnesData)
    .map(([nome, dados]) => ({
      nome,
      valor: dados[nutriente]
    }))
    .sort((a, b) => ordem === 'desc' ? b.valor - a.valor : a.valor - b.valor);

  res.json(ranking);
});

app.get('/api/sugestoes/:objetivo', (req, res) => {
  const { objetivo } = req.params;
  
  if (!objetivos[objetivo]) {
    return res.status(400).json({ error: 'Objetivo inválido' });
  }

  const criterios = objetivos[objetivo];
  const pontuacoes = Object.entries(carnesData).map(([nome, dados]) => {
    let pontuacao = 0;
    
    for (const [nutriente, criterio] of Object.entries(criterios)) {
      const valor = dados[nutriente];
      
      if (criterio.min && valor >= criterio.min) {
        pontuacao += criterio.peso;
      }
      if (criterio.max && valor <= criterio.max) {
        pontuacao += criterio.peso;
      }
      if (criterio.ideal) {
        const diff = Math.abs(valor - criterio.ideal);
        pontuacao += criterio.peso * (1 - diff/criterio.ideal);
      }
    }

    return { nome, pontuacao };
  });

  const sugestoes = pontuacoes
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, 5);

  res.json(sugestoes);
});

app.post('/api/comparar', (req, res) => {
  const { carnes } = req.body;
  
  if (!carnes || carnes.length === 0) {
    return res.status(400).json({ error: 'Selecione pelo menos uma carne!' });
  }

  const resultados = {};
  const nutrientes = [
    'calorias', 'proteinas', 'gorduras_totais', 'gorduras_saturadas',
    'colesterol', 'calcio', 'ferro', 'sodio', 'zinco', 'vitamina_b12'
  ];

  const carneBase = carnes[0];

  for (const nutriente of nutrientes) {
    resultados[nutriente] = {};
    const valorBase = carnesData[carneBase][nutriente];

    for (const carne of carnes) {
      const valor = carnesData[carne][nutriente];
      const diff = carne === carneBase ? 0 : ((valor - valorBase) / valorBase) * 100;

      resultados[nutriente][carne] = {
        valor,
        diferenca: diff
      };
    }
  }

  res.json({ resultados });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});