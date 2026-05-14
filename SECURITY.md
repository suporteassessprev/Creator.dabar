# Segurança — ViralPost

## Modelo de chaves de IA

A chave do **Google Gemini** é exclusivamente do servidor:

- Lida somente de `process.env.GEMINI_API_KEY`.
- O cliente nunca envia `apiKey`/`geminiApiKey` — a API ignora qualquer chave do body.
- Erros do Gemini não vazam a chave (log apenas da mensagem, nunca do objeto completo).
- Ausência da env retorna `503` com mensagem amigável:
  *"A chave de IA do sistema precisa ser atualizada pelo administrador."*

## Incidente — chaves vazadas (ação obrigatória)

Quatro segredos foram expostos em conversas / commits anteriores e **precisam ser revogados manualmente**. Esta lista é a fonte da verdade enquanto não estiver completamente rotacionada.

### 1. Google Gemini API Key — vazada
Chave detectada em `.claude/settings.local.json` (commit `4e616ba`). O Google já reportou como vazada (403 "Your API key was reported as leaked").

**O que fazer:**
1. Acesse https://aistudio.google.com/app/apikey
2. Delete a chave `AIzaSyD2WpyEXo4kMKoEa...` (qualquer chave que comece com esses caracteres).
3. Gere uma nova.
4. Na Vercel (project `creator-dabar`, env Production + Preview), atualize `GEMINI_API_KEY`.
5. Redeploy.
6. Edite o arquivo local `.claude/settings.local.json` e remova qualquer linha contendo `?key=AIza...`. O arquivo está em `.gitignore` agora, mas o working copy ainda pode conter a chave antiga.
7. **Opcional mas recomendado:** considerar `git filter-repo` para remover a chave do histórico do git (commit `4e616ba`). Sem isso, qualquer pessoa com acesso ao repositório consegue ler a chave antiga no histórico — mesmo que ela já esteja revogada.

### 2. Token Vercel — vazado
Token pessoal (`vcp_2mum...`) compartilhado em chat anterior.

**O que fazer:**
1. https://vercel.com/account/tokens
2. Revogue o token.
3. Gere outro só se for usar CLI; armazene fora do repositório.

### 3. Senha do banco Neon — vazada
Connection string com senha `npg_9Aw2...` apareceu em chat anterior.

**O que fazer:**
1. Painel Neon → projeto `viralpost` → Roles → `neondb_owner` → **Reset password**.
2. Copie a nova `DATABASE_URL` pooled.
3. Vercel → env vars → atualize `DATABASE_URL` (Production + Preview + Development).
4. Redeploy.

### 4. Senha admin padrão (`admin123`)
A seed agora se recusa a usar `admin123` em produção. Mas se já existir um usuário admin com essa senha no Neon:

**O que fazer:**
1. Defina `ADMIN_PASSWORD=<senha-forte>` na Vercel.
2. Faça login com a senha antiga e troque na tela de perfil — OU rode `npm run db:seed` no Neon (o seed só cria; não sobrescreve senha existente, então delete o registro antes).

Gere senha forte com:
```bash
openssl rand -base64 24
```

## Checklist antes do próximo deploy

- [ ] `GEMINI_API_KEY` rotacionada e atualizada na Vercel
- [ ] Token Vercel antigo revogado
- [ ] Senha do Neon resetada e `DATABASE_URL` atualizada
- [ ] `ADMIN_PASSWORD` setada com valor forte (>= 16 chars)
- [ ] `.env`, `.env.local`, `dev.db` confirmados fora do git (`git ls-files` não retorna)
- [ ] `.claude/settings.local.json` está em `.gitignore` (✅ já está) e a cópia local não contém chaves
- [ ] `NEXT_PUBLIC_APP_URL=https://creator-dabar-seven.vercel.app` na Vercel
- [ ] Redeploy disparado

## Como reportar uma vulnerabilidade

Abra uma issue privada ou contate o administrador. Não exponha detalhes da falha em PR ou chat público.
