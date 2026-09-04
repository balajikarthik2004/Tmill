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
  'What is driving the quality deviations?',
  'Which sales orders are at risk of delay?',
  'How is our export business performing?',
  'Which cotton lots are pending testing?',
]

const cannedResponses: Array<{ match: RegExp; response: string }> = [
  {
    match: /production.*(fall|drop|down|decrease|low)/i,
    response:
      'Output dipped against target mainly on the weekend shifts, plus lost hours from the ring frame currently in breakdown. Spinning Mill II carries the largest share of the shortfall. Open Production → Overview to see actual-vs-target by day and by unit.',
  },
  {
    match: /downtime|breakdown|machine/i,
    response:
      'Machines currently in breakdown are listed under Maintenance → Breakdowns, with the reported cause per machine (spindle bearing failures and drive trips are the most common). Machine Dashboard shows OEE and utilisation for the whole fleet across the five units.',
  },
  {
    match: /quality|deviation|test|uster/i,
    response:
      'Deviations are flagged where a Central Testing Laboratory reading falls outside its tolerance band — most often CSP, U% evenness or hairiness on yarn tests run on the USTER UT5 and CSP testers. Quality → Lab Tests lets you filter to Fail and Rework results.',
  },
  {
    match: /at risk|delay|late/i,
    response:
      'At-risk and delayed orders are driven mostly by cotton lot delays, rework, and breakdowns on the assigned frame. SO-291 is the most time-critical. Open Sales Orders and filter "At Risk" for the full list with production, quality and dispatch progress.',
  },
  {
    match: /export|country|countries|overseas/i,
    response:
      'Around 90% of production is exported to roughly 23 countries across America, Australia, Europe and South Asia, with annual sales over US$45 million. Sales → Export Orders breaks the current order book down by region and country.',
  },
  {
    match: /cotton|lot|pima|egyptian/i,
    response:
      'Cotton is sourced as Indian extra-long staple, Egyptian and US Pima. Lots awaiting clearance sit at status "In Testing" — Cotton & Raw Materials → Cotton Lots lists them with micronaire, staple, strength and trash readings from the USTER HVI and AFIS PRO-2.',
  },
]

function getStubResponse(question: string): string {
  const hit = cannedResponses.find((c) => c.match.test(question))
  if (hit) return hit.response
  return 'This assistant answers from the data already on screen — try asking about production output, machine downtime, quality tests, at-risk orders, export business, or cotton lots.'
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
