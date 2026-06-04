import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useSendChatMutation } from '../chatApi'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  provider?: string
}

/** Local slash/keyword commands handled client-side (no API call). Accepts an
 *  optional leading "/" and is accent-insensitive (e.g. "clear", "/clear", "xoá"). */
function asCommand(raw: string): 'clear' | 'help' | null {
  const c = raw
    .trim()
    .toLowerCase()
    .replace(/^\//, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  if (['clear', 'reset', 'cls', 'xoa'].includes(c)) return 'clear'
  if (['help', 'tro giup', 'huong dan', '?'].includes(c)) return 'help'
  return null
}

/** Quick-reply suggestions (i18n keys) — each maps to a known-good intent. */
const SUGGESTIONS = ['chat.s1', 'chat.s2', 'chat.s3', 'chat.s4'] as const

export default function ChatWidget() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [sendChat, { isLoading }] = useSendChatMutation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Seed the greeting the first time the panel opens.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', text: t('chat.greeting') }])
    }
  }, [open, messages.length, t])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading])

  async function send(raw: string) {
    const message = raw.trim()
    if (!message || isLoading) return
    setInput('')

    // Local commands — handled client-side, no API call.
    const command = asCommand(message)
    if (command === 'clear') {
      setMessages([{ role: 'assistant', text: t('chat.greeting') }])
      return
    }
    if (command === 'help') {
      setMessages((m) => [
        ...m,
        { role: 'user', text: message },
        { role: 'assistant', text: t('chat.greeting') },
      ])
      return
    }

    setMessages((m) => [...m, { role: 'user', text: message }])
    try {
      const res = await sendChat({ message, lang: i18n.language === 'vi' ? 'vi' : 'en' }).unwrap()
      setMessages((m) => [...m, { role: 'assistant', text: res.answer, provider: res.provider }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: t('chat.errorGeneric') }])
    }
  }

  return (
    <>
      {/* Collapsed circular FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => setOpen(true)}
            aria-label={t('chat.fabLabel')}
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
          >
            <MessageCircle size={26} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ transformOrigin: 'bottom right' }}
            role="dialog"
            aria-label={t('chat.title')}
            className="fixed bottom-6 right-6 z-[90] flex h-[70vh] max-h-[560px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-card-hover"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 bg-gradient-to-br from-navy-900 to-navy-800 px-4 py-3 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 shadow-glow">
                <Bot size={16} />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold">{t('chat.title')}</p>
                <p className="text-[10px] text-white/60">{t('chat.subtitle')}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="ml-auto rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4"
            >
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm',
                      m.role === 'user'
                        ? 'rounded-br-sm bg-primary-600 text-white'
                        : 'rounded-bl-sm border border-gray-100 bg-white text-gray-800 shadow-sm',
                    )}
                  >
                    {m.text}
                    {m.provider && m.provider !== 'MOCK' && (
                      <span className="mt-1 block text-[9px] font-medium uppercase tracking-widest text-gray-300">
                        {m.provider}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-3.5 py-3 shadow-sm">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-1.5 w-1.5 rounded-full bg-gray-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: d * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick-reply suggestions — shown at the greeting; the free-text input always stays */}
            {messages.length <= 1 && !isLoading && (
              <div className="flex flex-wrap gap-1.5 bg-white px-3 pt-2">
                {SUGGESTIONS.map((key) => (
                  <button
                    key={key}
                    onClick={() => void send(t(key))}
                    className="rounded-full border border-primary-600/30 bg-primary-50 px-3 py-1 text-[11px] font-medium text-primary-700 transition-colors hover:bg-primary-100"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-gray-100 bg-white p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(input)
                  }
                }}
                maxLength={500}
                placeholder={t('chat.placeholder')}
                className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
              />
              <button
                onClick={() => void send(input)}
                disabled={isLoading || !input.trim()}
                aria-label={t('chat.send')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
