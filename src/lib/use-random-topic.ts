import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getRandomTopic } from './api.functions'
import { errorMessage } from './errors'

/** Opens a random topic — the «Случайная идея» feature. */
export function useRandomTopic() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  async function go() {
    setPending(true)
    try {
      const topic = await getRandomTopic()
      if (!topic) {
        toast('Тем пока нет')
        return
      }
      await navigate({ to: '/n/$id', params: { id: String(topic.id) } })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }
  return { go, pending }
}
