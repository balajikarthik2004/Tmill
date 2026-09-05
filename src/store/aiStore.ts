/**
 * Copilot conversation state.
 *
 * Held in the store rather than in a component so the thread survives
 * navigation and is shared between the docked panel and the full copilot page -
 * ask a question from the dashboard, open the AI module, and the same
 * conversation is there.
 */
import { create } from 'zustand'

import type { AiChatMessage } from '@/types'
import { askCopilot } from '@/services'

const WELCOME: AiChatMessage = {
  id: 'welcome',
  role: 'assistant',
  createdAt: new Date().toISOString(),
  text:
    "I'm the T-Mills Copilot. I read the live plant record - machines, orders, lab tests, cotton lots, energy - alongside a knowledge base of closed cases. Describe a problem and I will give you the probable cause, how we resolved it before, who resolved it, and a costed plan with a realistic time to fix.",
}

interface AiState {
  messages: AiChatMessage[]
  isThinking: boolean
  /** Question currently being answered, shown while the assistant thinks. */
  pendingQuestion: string | null
  /** Set from elsewhere in the app (an insight card) and consumed by the copilot page. */
  queuedPrompt: string | null
  panelOpen: boolean
  askedCount: number

  setPanelOpen: (open: boolean) => void
  queuePrompt: (prompt: string) => void
  consumeQueuedPrompt: () => string | null
  ask: (question: string) => Promise<void>
  reset: () => void
}

export const useAiStore = create<AiState>((set, get) => ({
  messages: [WELCOME],
  isThinking: false,
  pendingQuestion: null,
  queuedPrompt: null,
  panelOpen: false,
  askedCount: 0,

  setPanelOpen: (panelOpen) => set({ panelOpen }),

  queuePrompt: (queuedPrompt) => set({ queuedPrompt }),

  consumeQueuedPrompt: () => {
    const prompt = get().queuedPrompt
    if (prompt) set({ queuedPrompt: null })
    return prompt
  },

  ask: async (question) => {
    const trimmed = question.trim()
    if (!trimmed || get().isThinking) return

    const userMessage: AiChatMessage = {
      id: `msg-${Date.now().toString(36)}`,
      role: 'user',
      createdAt: new Date().toISOString(),
      text: trimmed,
    }
    set((state) => ({
      messages: [...state.messages, userMessage],
      isThinking: true,
      pendingQuestion: trimmed,
    }))

    try {
      const answer = await askCopilot(trimmed)
      const assistantMessage: AiChatMessage = {
        id: answer.id,
        role: 'assistant',
        createdAt: new Date().toISOString(),
        answer,
      }
      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isThinking: false,
        pendingQuestion: null,
        askedCount: state.askedCount + 1,
      }))
    } catch {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `err-${Date.now().toString(36)}`,
            role: 'assistant',
            createdAt: new Date().toISOString(),
            text: 'I could not reach the plant data layer for that one. Try again in a moment.',
          },
        ],
        isThinking: false,
        pendingQuestion: null,
      }))
    }
  },

  reset: () => set({ messages: [WELCOME], isThinking: false, pendingQuestion: null, askedCount: 0 }),
}))
