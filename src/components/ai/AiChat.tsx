import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, RotateCcw, Sparkles, SquarePen, User } from 'lucide-react'

import { useAiStore } from '@/store/aiStore'
import { suggestedPrompts } from '@/services'
import { cn } from '@/lib/utils'
import { AiAnswerCard } from './AiAnswerCard'
import { AiThinking } from './AiThinking'

/**
 * The conversation surface. Used both in the docked panel and as the full
 * copilot page — the thread itself lives in the store, so both views show the
 * same conversation.
 */
export function AiChat({ compact = false }: { compact?: boolean }) {
  const { messages, isThinking, pendingQuestion, ask, reset } = useAiStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id
  const isEmpty = messages.length <= 1

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [messages.length, isThinking])

  function send(question: string) {
    if (!question.trim() || isThinking) return
    setInput('')
    void ask(question)
    inputRef.current?.focus()
  }

  /** Grow the composer with the text, up to a sensible ceiling. */
  function autoSize(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Thread */}
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div className={cn('mx-auto w-full px-4 py-6', compact ? 'max-w-full' : 'max-w-4xl lg:px-8')}>
          {isEmpty && !isThinking ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-forest-800 text-white shadow-md">
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-[19px] font-semibold tracking-tight text-foreground">
                How can I help at the mill today?
              </h2>
              <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                Describe a problem, or name a machine, an order or a lot. I will give you the probable
                cause, how it was resolved before, who resolved it, and a plan with a realistic time to fix.
              </p>
            </div>
          ) : null}

          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                // The stored welcome line is replaced by the empty state above.
                if (message.id === 'welcome') return null

                if (message.role === 'user') {
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-row-reverse gap-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-forest-900 px-4 py-2.5 text-[13px] leading-relaxed text-white shadow-sm">
                        {message.text}
                      </div>
                    </motion.div>
                  )
                }

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-forest-800 text-white shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    {message.answer ? (
                      <AiAnswerCard
                        answer={message.answer}
                        stream={message.id === lastAssistantId}
                        onFollowUp={send}
                        compact={compact}
                      />
                    ) : (
                      <div className="max-w-[86%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-2.5 text-[13px] leading-relaxed text-foreground shadow-sm">
                        {message.text}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {isThinking && <AiThinking question={pendingQuestion} />}
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-card/70 backdrop-blur">
        <div className={cn('mx-auto w-full px-4 py-3', compact ? 'max-w-full' : 'max-w-4xl lg:px-8 lg:py-4')}>
          {/* Prebuilt questions sit directly above the input */}
          {isEmpty && !isThinking && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-[11.5px] font-medium text-muted-foreground shadow-xs transition-colors hover:border-brand-200 hover:bg-accent hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm transition-colors focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-500/15"
          >
            {!isEmpty && (
              <button
                type="button"
                onClick={reset}
                title="Start a new conversation"
                aria-label="Start a new conversation"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <SquarePen className="h-4 w-4" />
              </button>
            )}

            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                autoSize(e.currentTarget)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              placeholder="Describe a problem, name a machine (RF-014) or an order (SO-291)…"
              disabled={isThinking}
              className="scrollbar-thin max-h-40 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={isThinking || !input.trim()}
              aria-label="Send"
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
                isThinking || !input.trim()
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:scale-95',
              )}
            >
              {isThinking ? (
                <RotateCcw className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </form>

          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Grounded in live plant records and the resolution knowledge base. Verify before acting on a
            customer commitment.
          </p>
        </div>
      </div>
    </div>
  )
}
