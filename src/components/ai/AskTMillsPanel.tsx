import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, User, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
      text: "Hi, I'm Ask T-Mills — your executive AI assistant for production, quality, orders, and energy questions.",
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed || isTyping) return
    
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate 2-second loading for realistic AI feel
    setTimeout(() => {
      const botMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', text: getStubResponse(trimmed) }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 2000)
  }

  return (
    <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md bg-white">
      <SheetHeader className="border-b border-border bg-brand-50/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col items-start">
            <SheetTitle className="text-xl">Ask T-Mills AI</SheetTitle>
            <SheetDescription className="text-brand-600">Executive Intelligence Agent</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-6 py-6 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm',
                  m.role === 'assistant' ? 'bg-brand-100 text-brand-600' : 'bg-secondary text-secondary-foreground',
                )}
              >
                {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div
                className={cn(
                  'max-w-[82%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm',
                  m.role === 'assistant' 
                    ? 'bg-white border border-brand-100 text-brand-950 rounded-tl-none' 
                    : 'bg-brand-600 text-white rounded-tr-none',
                )}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex gap-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex max-w-[80%] rounded-2xl rounded-tl-none border border-brand-100 bg-white px-4 py-4 shadow-sm items-center gap-1.5">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  className="w-1.5 h-1.5 bg-brand-400 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  className="w-1.5 h-1.5 bg-brand-400 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  className="w-1.5 h-1.5 bg-brand-400 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-border bg-brand-50/30 p-5">
        {!isTyping && messages.length <= 2 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex flex-wrap gap-2"
          >
            {exampleQuestions.slice(0, 3).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-100 hover:text-brand-900 shadow-sm"
              >
                {q}
              </button>
            ))}
          </motion.div>
        )}
        <form
          className="flex items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the executive intelligence agent..."
              className="pr-10 rounded-full border-brand-200 bg-white shadow-sm focus-visible:ring-brand-500"
              disabled={isTyping}
            />
          </div>
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full shrink-0 bg-brand-600 hover:bg-brand-700 shadow-md transition-transform active:scale-95 disabled:opacity-50"
            disabled={isTyping || !input.trim()}
          >
            {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </SheetContent>
  )
}
