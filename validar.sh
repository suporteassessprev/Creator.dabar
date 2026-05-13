#!/bin/bash
set -e

cd "$(dirname "$0")"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ViralPost — Validação Final"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "▶ [1/4] npm run lint…"
npm run lint
echo "✅ Lint: ok"
echo ""

echo "▶ [2/4] npm run build…"
npm run build
echo "✅ Build: ok"
echo ""

echo "▶ [3/4] npx prisma db seed…"
npx prisma db seed
echo "✅ Seed: ok"
echo ""

echo "▶ [4/4] Removendo prisma/dev.db stale…"
if [ -f "prisma/dev.db" ]; then
  rm prisma/dev.db
  echo "✅ prisma/dev.db removido"
else
  echo "ℹ️  prisma/dev.db não encontrado (já removido)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Validação concluída com sucesso!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
