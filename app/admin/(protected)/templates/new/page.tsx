import TemplateVisualEditor from '@/components/admin/TemplateVisualEditor'

export const metadata = { title: 'Novo Template — Creator Dabar Admin' }

export default function NewTemplatePage() {
  return (
    <TemplateVisualEditor
      initialMeta={{
        name: '',
        description: '',
        mode: 'creative',
        active: true,
        published: false,
      }}
    />
  )
}
