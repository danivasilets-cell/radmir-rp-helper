import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'

const COMMAND_LINE = /^\/(me|do|try|todo|b|n|s)\s/
/** «![подпись](/api/topic-images/<key>)» — only photos uploaded to the site. */
const IMAGE_LINE =
  /^!\[([^\]]*)\]\((\/api\/(?:topic|news)-images\/[a-f0-9-]{36})\)$/

function Gallery({ images }: { images: { alt: string; src: string }[] }) {
  return (
    <div
      className={
        images.length === 1 ? 'my-4' : 'my-4 grid grid-cols-2 gap-2 sm:gap-3'
      }
    >
      {images.map((img, i) => (
        <a
          key={i}
          href={img.src}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border bg-muted"
        >
          <img
            src={img.src}
            alt={img.alt || 'Фото'}
            loading="lazy"
            className={
              images.length === 1
                ? 'max-h-[32rem] w-full object-contain'
                : 'aspect-video w-full object-cover'
            }
          />
        </a>
      ))}
    </div>
  )
}

/** Small copy button for RP command lines — paste straight into the game chat. */
function CopyCommand({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Скопировать: ${text}`}
      title="Скопировать команду"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text.replace(/\*\*/g, ''))
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        } catch {
          // clipboard unavailable
        }
      }}
      className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-60 transition-opacity group-hover/cmd:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100 motion-reduce:transition-none"
    >
      {done ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  )
}

/** Highlights RP commands like /me, /do, /try inside a line. */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\/(?:me|do|try|b|n|s|todo)\b)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (/^\/(me|do|try|b|n|s|todo)$/.test(part))
      return (
        <code
          key={i}
          className="rounded bg-primary/15 px-1.5 py-0.5 text-[0.9em] font-semibold text-primary"
        >
          {part}
        </code>
      )
    return part
  })
}

/**
 * Minimal, safe markdown: "## heading", "- list", blank-line paragraphs.
 * Single line breaks inside a paragraph are kept as they were typed.
 */
export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r/g, '').split('\n')
  let list: string[] = []
  let para: string[] = []
  let images: { alt: string; src: string }[] = []

  const flush = () => {
    if (images.length) {
      blocks.push(<Gallery key={blocks.length} images={images} />)
      images = []
    }
    if (list.length) {
      blocks.push(
        <ul key={blocks.length} className="my-3 space-y-2">
          {list.map((item, i) => (
            <li key={i} className="group/cmd flex gap-3">
              <span
                aria-hidden
                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
              />
              <span>{inline(item)}</span>
              {COMMAND_LINE.test(item) && <CopyCommand text={item} />}
            </li>
          ))}
        </ul>,
      )
      list = []
    }
    if (para.length) {
      blocks.push(
        <p key={blocks.length} className="my-3">
          {para.map((l, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {inline(l)}
            </span>
          ))}
        </p>,
      )
      para = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    const img = IMAGE_LINE.exec(line)
    if (img) {
      if (list.length || para.length) {
        const pending = images
        images = []
        flush()
        images = pending
      }
      images.push({ alt: img[1], src: img[2] })
      continue
    }
    if (images.length && line) flush()
    if (!line) {
      if (!images.length) flush()
    } else if (line.startsWith('#')) {
      flush()
      blocks.push(
        <h2
          key={blocks.length}
          className="mt-7 mb-2 text-lg text-primary first:mt-0"
        >
          {line.replace(/^#+\s*/, '')}
        </h2>,
      )
    } else if (/^[-*•]\s+/.test(line)) {
      if (para.length) flush()
      list.push(line.replace(/^[-*•]\s+/, ''))
    } else if (COMMAND_LINE.test(line)) {
      flush()
      blocks.push(
        <p
          key={blocks.length}
          className="group/cmd my-2 flex items-start gap-2 rounded-lg border-l-2 border-primary bg-primary/5 py-1.5 pr-1.5 pl-3"
        >
          <span>{inline(line)}</span>
          <CopyCommand text={line} />
        </p>,
      )
    } else {
      if (list.length) flush()
      para.push(line)
    }
  }
  flush()

  return <div className="leading-relaxed text-foreground/90">{blocks}</div>
}
