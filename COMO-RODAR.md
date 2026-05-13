# 🚀 ViralPost — Como Rodar o Projeto

## Pré-requisitos
- Node.js 18+ instalado
- Uma chave de API do Google Gemini (gratuita em https://aistudio.google.com/app/apikey)

## Instalação

```bash
# 1. Entre na pasta do projeto
cd viral-carousel

# 2. Instale as dependências
npm install

# 3. Rode em modo de desenvolvimento
npm run dev
```

## Acesse no navegador
Abra: **http://localhost:3000**

## Configurar sua API Key
1. Acesse a plataforma em http://localhost:3000
2. Clique em **Configurações** na sidebar
3. Cole sua chave do Google Gemini
4. Clique em **Testar** e depois **Salvar**

## Gerar seu primeiro carrossel
1. Clique em **Novo Carrossel**
2. Digite o tema (ex: "5 erros que destroem negócios online")
3. Escolha o tom e o número de slides
4. Clique em **Gerar Carrossel Viral**
5. Aguarde (~20-60 segundos com imagens)
6. Edite no editor e exporte!

## Deploy para produção (Vercel)
```bash
npm install -g vercel
vercel deploy
```

## Estrutura do projeto
```
viral-carousel/
├── app/
│   ├── page.tsx          # Landing page
│   ├── dashboard/        # Dashboard com carrosséis
│   ├── generator/        # Gerador com IA
│   ├── editor/           # Editor visual
│   ├── settings/         # Configurações de API
│   └── api/              # Backend routes
├── components/           # Componentes reutilizáveis
├── lib/
│   ├── gemini.ts         # Integração Gemini
│   └── store.ts          # Estado global (Zustand)
```

## Tecnologias usadas
- **Next.js 14** — Framework React
- **Tailwind CSS** — Estilização
- **Google Gemini** — IA para texto e imagens
- **Zustand** — Gerenciamento de estado
- **html2canvas** — Exportação de slides
