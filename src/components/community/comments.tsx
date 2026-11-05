import { useState, type FormEvent } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Loader2, MessageSquare, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addComment, deleteComment } from '@/lib/community.functions'
import { errorMessage } from '@/lib/errors'
import { allowed, type CommentItem, type SessionInfo } from '@/lib/types'
import { ReportButton } from './report-button'
import { Avatar, AuthorName, timeAgo } from './user-link'

export function Comments({
  nodeId,
  comments,
  session,
}: {
  nodeId: number
  comments: CommentItem[]
  session: SessionInfo
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const team = allowed(session, 'content.moderate')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (text.trim().length < 2) {
      setError('Напишите комментарий')
      return
    }
    setPending(true)
    setError(null)
    try {
      await addComment({ data: { nodeId, text } })
      setText('')
      toast.success('Комментарий опубликован')
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id: number) {
    setDeleting(id)
    try {
      await deleteComment({ data: { id } })
      toast.success('Комментарий удалён')
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <section className="mt-12 max-w-reading" aria-labelledby="comments-title">
      <h2 id="comments-title" className="flex items-center gap-2 text-xl">
        <MessageSquare className="size-5 text-primary" aria-hidden />
        Комментарии
        <span className="text-base text-muted-foreground">
          {comments.length}
        </span>
      </h2>

      {comments.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Комментариев пока нет — будьте первым.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {comments.map((c) => {
            const canDelete =
              team || (c.userId !== null && session?.userId === c.userId)
            return (
              <li
                key={c.id}
                className="flex gap-3 rounded-xl border bg-card p-4"
              >
                <Avatar name={c.authorName} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <AuthorName name={c.authorName} role={c.authorRole} />
                    <time
                      dateTime={c.createdAt}
                      className="text-xs text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {timeAgo(c.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-sm break-words whitespace-pre-line text-foreground/90">
                    {c.text}
                  </p>
                </div>
                {!(c.userId !== null && session?.userId === c.userId) &&
                  c.userId !== null && (
                    <ReportButton
                      targetType="comment"
                      targetId={c.id}
                      label="Пожаловаться на комментарий"
                      iconOnly
                    />
                  )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Удалить комментарий"
                    disabled={deleting === c.id}
                    onClick={() => handleDelete(c.id)}
                  >
                    {deleting === c.id ? (
                      <Loader2 className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {session ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <label htmlFor="comment-text" className="text-sm font-medium">
            Ваш комментарий
          </label>
          <Textarea
            id="comment-text"
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Поделитесь опытом отыгровки или дополните тему…"
            aria-invalid={!!error}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {text.length}/2000 · Без оскорблений и рекламы
            </span>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Send />
              )}
              Отправить
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Link
            to="/login"
            search={{ tab: 'player' }}
            className="font-semibold text-primary hover:underline"
          >
            Войдите или зарегистрируйтесь
          </Link>
          , чтобы комментировать.
        </p>
      )}
    </section>
  )
}
