'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import TemplateForm, { type TemplateFormValues } from '@/components/admin/TemplateForm'
import { Loader2, AlertCircle } from 'lucide-react'

export default function EditTemplatePage() {
  const params = useParams()
  const id = params.id as string

  const [values,  setValues]  = useState<Partial<TemplateFormValues> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/templates/${id}`)
        if (!res.ok) throw new Error('Template não encontrado')
        const data = await res.json()
        setValues({
          name:        data.name,
          description: data.description ?? '',
          mode:        data.mode,
          format:      data.format,
          layout:      data.layout,
          palette:     data.palette,
          active:      data.active,
          published:   data.published,
        })
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        <Loader2 size={24} className="animate-spin mr-3" />
        Carregando template...
      </div>
    )
  }

  if (error || !values) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass rounded-2xl p-8 text-center max-w-sm">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Erro</h2>
          <p className="text-gray-400 text-sm">{error || 'Template não encontrado'}</p>
        </div>
      </div>
    )
  }

  return <TemplateForm initialValues={values} templateId={id} />
}
