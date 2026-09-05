import { useEffect } from 'react'

import { useAiStore } from '@/store/aiStore'
import { AiChat } from '@/components/ai/AiChat'

/**
 * The copilot workspace. Deliberately chrome-free — the shell drops its header
 * and breadcrumbs for this route, so the conversation occupies the full pane
 * beside the sidebar.
 */
export default function Copilot() {
  const { ask, consumeQueuedPrompt, queuedPrompt } = useAiStore()

  // An insight card elsewhere in the app can hand a question to this page.
  useEffect(() => {
    const prompt = consumeQueuedPrompt()
    if (prompt) void ask(prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedPrompt])

  return <AiChat />
}
