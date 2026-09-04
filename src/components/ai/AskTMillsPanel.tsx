import { useState } from 'react'
import { Bot, Send, Sparkles, User } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const exampleQuestions = [
  'Why did production fall this week?',
  'Which machine has the highest downtime?',
  'What is driving the quality deviations this month?',
  'Which sales orders are at risk of delay?',
  'How is our renewable energy mix trending?',
]

const cannedResponses: Array<{ match: RegExp; response: string }> = [
  {
    match: /production.*(fall|drop|down|decrease)/i,
    response:
      'Production dipped ~4% this week mainly due to the RF-021 breakdown in Spinning Unit 2 (≈9 hours lost) and a weekend dip in Spinning Unit 3. Ring Spinning output was most affected. Recommend expediting the RF-021 repair to recover Friday–Saturday throughput.',
  },
  {
    match: /downtime|breakdown/i,
    response:
      'RF-021 (Ring Spinning, Spinning Unit 2) currently has the highest downtime this month at ~14 hours across 2 breakdown events, driven by spindle bearing failures. It is flagged as a critical machine — a spare bearing kit is on order.',
  },
  {
    match: /quality|deviation/i,
    response:
      'Quality deviations this month are concentrated in 60s Ring Spun Combed yarn, with CSP and Uster% occasionally drifting outside tolerance on Carding line 2. Overall pass rate remains healthy at 98.4%.',
  },
  {
    match: /at risk|delay/i,
    response:
      '17 sales orders are currently flagged at risk, most commonly due to machine breakdowns and cotton lot delays. SO-291 (export order) is the most time-critical, due in 3 days. Open Sales Orders → filter "At Risk" for the full list.',
  },
  {
    match: /renewable|energy/i,
    response:
      'Renewable energy currently covers 64% of total consumption (182,400 kWh today), slightly ahead of last week. Energy intensity is 7.62 kWh/kg, just above the 7.50 target — worth reviewing Spinning Unit 2 specific energy.',
  },
]

function getStubResponse(question: string): string {
  const hit = cannedResponses.find((c) => c.match.test(question))
  if (hit) return hit.response
  return "This is a prototype assistant with canned responses for a demo dataset. Try one of the suggested questions, or ask about production, downtime, quality, at-risk orders, or energy — I'll connect to live T-Mills data in a future release."
}

export function AskTMillsPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi, I'm Ask T-Mills — your executive assistant for production, quality, orders, and energy questions. This is a demo with canned responses. Try a suggested question below.",
    },
  ])
  const [input, setInput] = useState('')

  function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed }
    const botMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', text: getStubResponse(trimmed) }
    setMessages((prev) => [...prev, userMsg, botMsg])
    setInput('')
  }

  return (
    <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
      <SheetHeader className="border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-900 text-brand-500">
            <Sparkles className="h-4 w-4" />
          </div>
          <SheetTitle>Ask T-Mills</SheetTitle>
        </div>
        <SheetDescription>AI assistant · UI preview, no live backend yet</SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                m.role === 'assistant' ? 'bg-navy-900 text-brand-500' : 'bg-secondary text-secondary-foreground',
              )}
            >
              {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'assistant' ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground',
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {exampleQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-accent"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about production, quality, orders…"
          />
          <Button type="submit" size="icon" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </SheetContent>
  )
}
