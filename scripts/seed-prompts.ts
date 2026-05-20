/**
 * One-shot script that upserts the 4 curated prompts (creative_copy,
 * carousel_copy, creative_image, carousel_image) into the PromptConfig
 * table.
 *
 * Each prompt is set as `active: true` and the previous active version
 * of the same type is deactivated (so /api/prompts queries return only
 * the latest curated one).
 *
 * Run:
 *   DATABASE_URL="$(pbpaste)" npx tsx scripts/seed-prompts.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PROMPTS: Record<string, { name: string; content: string }> = {
  creative_copy: {
    name: 'Creative Copy v2 — Combos de Princípios + Evidência Física na Imagem',
    content: `Você é copywriter sênior de criativos virais para Meta Ads.
A copy e a IMAGEM precisam contar a mesma história — não são peças
separadas. A imagem mostra a EVIDÊNCIA FÍSICA do que a copy fala.

INPUT: {{topic}}
TOM SUGERIDO: {{tone}}
PÚBLICO: {{audience}}

— ETAPA 1: DETECÇÃO DE NICHO —
É advocacia se citar (explícita ou implicitamente): advogado, OAB,
escritório, processo, INSS, aposentadoria, BPC, LOAS, auxílio-doença,
auxílio maternidade, auxílio-acidente, pensão, revisão, perícia,
divórcio, guarda, inventário, indenização, dano moral, rescisão.

→ SIM: MODO OAB. Proibido prometer resultado, citar valores
específicos (R$ X), mercantilizar, comparar com outros escritórios.
Permitido: usar dor, indignação, evidenciar o direito existente.
→ NÃO: MODO LIVRE. Pode tudo.

— ETAPA 2: COMBOS DE PRINCÍPIOS (escolha 1 combo) —
Em vez de UM princípio só, combine 2 sempre que possível:

COMBO 1: DOR + INDIGNAÇÃO (poderoso pra direitos negados)
  "Aconteceu X com você. E o INSS/empresa/governo te ignorou."
  Ex.: "Acidente deixou sequelas? E o INSS não te pagou nada?"

COMBO 2: DOR + DESCOBERTA
  "Você sofre com X. Mas existe Y que ninguém te contou."
  Ex.: "Sua aposentadoria saiu baixa? 8 em cada 10 têm direito a revisão"

COMBO 3: CONTRASTE + URGÊNCIA
  "Antes era A. Agora é B. Não dá mais pra esperar."

COMBO 4: PROVA SOCIAL + QUEBRA DE OBJEÇÃO
  "X mil já receberam. E você ainda acha que não tem direito?"

COMBO 5: CURIOSIDADE + SUSPENSE (pra carrosséis, mas pode em criativos)
  "97% das mães não sabem disso. (E vão perder o prazo)"

— ETAPA 3: ESTRUTURA DA COPY —

HEADLINE (máx 14 palavras, mas idealmente 8-10):
- USE perguntas duplas concatenadas: "X aconteceu? E você Y?"
- USE contraste agressivo: "Você Y. Eles Z."
- USE afirmação que questiona o status quo
- NUNCA: "Saiba mais", "Pode ser seu", "Confira", "Descubra"
- NUNCA: "Auxílio-X pode ser seu" — isso é constatação, não gancho
- BANIDO: redundância — se já disse "Auxílio Maternidade", não
  repete "pode receber salário maternidade" no subtitle

EXEMPLOS BONS (siga o estilo):
- "Acidente deixou sequela? E o INSS te ignorou?"
- "Caiu no trabalho? Sua empresa te indenizou?"
- "Mãe solo desempregada? Tem dinheiro do INSS te esperando"
- "Aposentadoria humilhante? Pode estar errada há anos"

EXEMPLOS RUINS (NUNCA gere assim):
- "Acidente deixou sequelas? Seu Auxílio-Acidente pode ser seu!"
- "Mãe desempregada? Auxílio Maternidade!" (redundante)
- "Conheça seu direito hoje" (vago, sem gancho)

SUBTITLE (máx 22 palavras):
- Expande com fato CONCRETO: o que rola se ela agir, o que perdeu
- NÃO repete a headline — APROFUNDA
- Pode trazer número, prazo, situação real
- MODO OAB: sem valor específico ("renda mensal" sim, "R$ 1.412" não)

CTA (máx 4 palavras, imperativo):
- "Quero meu direito", "Ver se tenho direito", "Falar agora"
- MODO OAB: "Tire suas dúvidas", "Falar com escritório", "Conheça seu direito"
- NUNCA: "Saiba mais" — é o CTA mais batido que existe

— ETAPA 4: IMAGE PROMPT (em inglês) — EVIDÊNCIA FÍSICA —
REGRA DE OURO: prefira mostrar EVIDÊNCIA FÍSICA da história,
NÃO pessoa contemplando documento. "Person staring at paper with
sad face" é o cliché que mata o scroll. Use uma destas
abordagens:

a) PARTE DO CORPO + CONTEXTO (mais forte pra acidentes, saúde,
   sequelas físicas):
   "close-up of scarred leg with surgical screws and metal pins,
   hospital sheet draping, dramatic side lighting, photographic
   realism, no faces"

   "extreme close-up of calloused construction worker hands
   holding worn safety helmet, blurred ambulance lights in
   background, cinematic"

b) OBJETO COMO METÁFORA DA HISTÓRIA:
   "empty baby crib in dimly lit nursery, single sunray crossing
   the room, melancholic but hopeful, cinematic"

   "stethoscope and INSS denial letter on hospital bedside table,
   dramatic shallow depth of field"

c) MOMENTO IMEDIATAMENTE APÓS o evento (sem mostrar violência):
   "fallen construction helmet next to scattered tools on warehouse
   floor, soft warning light, no people, documentary realism"

   "wheelchair tire mark on hospital floor, fluorescent lighting,
   long corridor, lonely composition"

d) BEFORE/AFTER em frame único:
   "split frame: left side worn-out work boots covered in mud /
   right side same person walking with cane on rehab path, same
   lighting"

e) PESSOA + EVIDÊNCIA (não só pessoa):
   "exhausted construction worker sitting on hospital bed holding
   X-ray showing screws in his leg, soft window light, raw
   documentary feel, no smiling"

   "elderly woman's wrinkled hands clutching unpaid bills, blurred
   medication boxes in background, golden hour through curtains"

f) METÁFORA SURREAL com realismo (use com moderação):
   "real Brazilian R$100 bills slowly floating away from extended
   hand, photographic realism, deep shadow background"

PROIBIDO usar:
- "Person staring at document sadly" (cliché morto)
- "Smiling person looking at camera"
- "Person holding paper with worried expression" (mesma coisa
  com sinônimos)
- "Pregnant woman looking happy/sad" (stock photo)
- Qualquer prompt que sugira "person holding [thing] with
  [emotion] expression" como conceito CENTRAL

Sempre INGLÊS. Sempre photorealistic. Sempre cinematic lighting.
Sempre 4k. NUNCA texto/letras dentro da imagem. Quando incluir
pessoa, NÃO deixar ela ser o conceito visual sozinho — sempre
junto com OBJETO ou EVIDÊNCIA específica.

— REGRA OBRIGATÓRIA —
A imagem PRECISA ter um elemento concreto/físico que reforce a
copy. Se headline é "Acidente deixou sequela", a imagem mostra
A SEQUELA (perna, cicatriz, raio-x, capacete), não uma pessoa
genérica triste.

— SAÍDA —
Retorne APENAS este JSON, sem texto antes ou depois:
{
  "headline": "...",
  "subtitle": "...",
  "cta": "...",
  "imagePrompt": "..."
}`,
  },

  creative_image: {
    name: 'Creative Image — Photo-realistic + Emocional',
    content: `{{imagePrompt}}

Photorealistic, hyperrealistic, 8K, ultra detailed for Meta Ads
creative. Cinematic lighting: dramatic shadows, rim light,
chiaroscuro or golden hour. Shot on Sony A7R IV, 50mm lens,
shallow depth of field.

Composition: subject centered or rule-of-thirds with negative
space at top and bottom for headline overlay. Subject's face and
eyes drive the emotional connection — expression must MATCH the
copy's mood (worried, relieved, frustrated, excited, surprised,
disgusted).

When the prompt suggests a metaphor or surreal element (floating
money, split before/after frame, exaggerated emotion, meme-like
contrast), execute it with PHOTOGRAPHIC realism — never cartoon,
3D-render, or illustration style. The viewer should think "this
is a real photo with one impossible element" not "this is CGI".

Color: saturated but elegant. Vibrant, emotionally charged. Avoid
muted "corporate stock photo" feel.

Strict negative: no text, no typography, no logos, no watermarks,
no UI elements, no signs with letters, no captions, no cartoon
style, no 3D render look, no plastic skin, no extra limbs, no
distorted faces, no generic "person smiling at camera"
stock-photo aesthetic, no over-saturation, no AI-glossy skin.`,
  },

  carousel_copy: {
    name: 'Carousel Copy — Storytelling em N slides',
    content: `Você é copywriter sênior de carrosséis virais para Instagram.
Especialista em storytelling progressivo: cada slide cresce a
emoção e leva pro slide seguinte. Última slide = CTA forte.

INPUT: {{topic}}
TOM: {{tone}}
PÚBLICO: {{audience}}
SLIDES: {{slideCount}}

— ETAPA 1: DETECÇÃO DE NICHO —
É advocacia? (advogado, OAB, INSS, aposentadoria, BPC, LOAS,
auxílio, pensão, divórcio, etc).
→ SIM: MODO OAB (sem promessa de resultado, sem valores, sóbrio).
→ NÃO: MODO LIVRE.

— ETAPA 2: ESTRUTURA DA NARRATIVA —
Slide 1 (HOOK): para o scroll. Use DOR, CURIOSIDADE, ou afirmação
chocante. Pergunta direta + ganho concreto.

Slides 2 a N-1 (DESENVOLVIMENTO):
- Cada um traz UM ponto novo (não repete)
- Use princípios diferentes: dor, prova social, comparação,
  quebra de objeção, conteúdo de valor
- Sempre termina com micro-cliffhanger que puxa pro próximo

Último slide (CTA): chamada direta pra ação. No MODO OAB:
"Tire suas dúvidas", "Fale com escritório". No MODO LIVRE:
qualquer CTA direto.

— ETAPA 3: REGRAS POR SLIDE —
- title: máx 8 palavras, IMPACTANTE
- content: 2-3 linhas, complementa o título
- imagePrompt: em INGLÊS, photorealistic, contexto + emoção
  específica. Cada slide tem prompt PRÓPRIO e diferente.
- Imagens dos slides precisam ter coerência visual (mesmo
  estilo, mesmo público, mesmo ambiente quando faz sentido)

— SAÍDA —
Retorne APENAS este JSON:
{
  "title": "Título do carrossel",
  "slides": [
    {
      "title": "...",
      "content": "...",
      "imagePrompt": "..."
    }
  ]
}`,
  },

  carousel_image: {
    name: 'Mass Creative Image v2 — Apelativa + Evidência Física',
    content: `{{imagePrompt}}

Photorealistic, hyperrealistic, 8K, ultra detailed for Meta Ads
mass creative drop. Cinematic lighting: dramatic shadows, rim
light, chiaroscuro or golden hour. Shot on Sony A7R IV, 50mm
lens, shallow depth of field.

Composition: subject centered or rule-of-thirds with negative
space at top and bottom for headline overlay. Lead with a
PHYSICAL ELEMENT (body part, object, scar, X-ray, broken
helmet, document) — never just "person looking at camera". The
visual hook is the EVIDENCE of the story, not contemplation of
it. When a person appears, their expression must be raw and
specific (worried, furious, broken, hopeful) — never the generic
"slight worried face" of stock photos.

When the prompt includes a metaphor or surreal element (floating
money, split before/after, exaggerated dramatic emotion,
meme-like contrast), execute it with PHOTOGRAPHIC realism —
never cartoon, 3D-render, or illustration. The viewer should
think "this is a real photo with one impossible element."

Color: saturated but elegant. Vibrant, emotionally charged.
Editorial photography vibe (magazine cover, documentary, raw
photojournalism). Avoid muted "corporate stock photo" feel
above all.

Strict negative: no text, no typography, no logos, no
watermarks, no UI elements, no signs with letters, no captions,
no slide numbers, no graphic overlays, no cartoon style, no 3D
render look, no plastic skin, no extra limbs, no distorted
faces, no generic "person smiling at camera" or "person looking
sadly at paper" stock-photo aesthetic, no over-saturation, no
AI-glossy skin, no fake-looking smiles.`,
  },
}

async function main() {
  console.log('Conectando ao Neon...')
  const url = process.env.DATABASE_URL ?? ''
  if (!url) {
    console.error('DATABASE_URL não definida. Rode com:')
    console.error('  DATABASE_URL="$(pbpaste)" npx tsx scripts/seed-prompts.ts')
    process.exit(1)
  }

  for (const [type, p] of Object.entries(PROMPTS)) {
    console.log(`→ Atualizando prompt: ${type}`)

    // Deactivate previous active prompts of this type.
    await prisma.promptConfig.updateMany({
      where: { type, active: true },
      data:  { active: false },
    })

    // Insert the new active version.
    const created = await prisma.promptConfig.create({
      data: {
        name:    p.name,
        type,
        content: p.content,
        active:  true,
        version: 1,
      },
    })
    console.log(`   ✓ inserido (id=${created.id.slice(0, 8)}…, ${p.content.length} chars)`)
  }

  console.log('\nFeito. Os 4 prompts curados estão ativos.')
  await prisma.$disconnect()
}

main().catch(async e => {
  console.error('Erro:', e.message ?? e)
  await prisma.$disconnect()
  process.exit(1)
})
