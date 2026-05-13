import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import PromptForm from '@/components/admin/PromptForm'

export const metadata = { title: 'Editar Prompt — ViralPost Admin' }

export default async function EditPromptPage({
  params,
}: {
  params: { id: string }
}) {
  const prompt = await prisma.promptConfig.findUnique({
    where: { id: params.id },
    include: {
      versions: { orderBy: { version: 'desc' } },
    },
  })

  if (!prompt) notFound()

  return (
    <PromptForm
      initial={{
        id:       prompt.id,
        name:     prompt.name,
        type:     prompt.type as any,
        content:  prompt.content,
        active:   prompt.active,
        version:  prompt.version,
        versions: prompt.versions.map(v => ({
          id:        v.id,
          version:   v.version,
          content:   v.content,
          createdAt: v.createdAt.toISOString(),
        })),
      }}
    />
  )
}
