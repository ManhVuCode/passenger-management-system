import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { MessageCircle, X, Send, Bot, Sparkles } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useSendChatMutation } from '../chatApi'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  provider?: string
}

/** Các lệnh slash/keyword xử lý phía client (không gọi API). Chấp nhận dấu
 *  "/" đứng đầu tuỳ chọn và bỏ qua dấu tiếng Việt (vd: "clear", "/clear", "xoá"). */
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

/** Gợi ý trả lời nhanh (i18n keys) — mỗi key ứng với một intent đã được kiểm chứng. */
const SUGGESTIONS = ['chat.s1', 'chat.s2', 'chat.s3', 'chat.s4'] as const

/** Ô avatar trợ lý nhỏ neo cạnh bong bóng tin nhắn của assistant. */
function BotTile() {
  return (
    <div
      aria-hidden
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-primary-600 text-white shadow-sm ring-1 ring-white/30"
    >
      <Bot size={12} />
    </div>
  )
}

export default function ChatWidget() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [sendChat, { isLoading }] = useSendChatMutation()
  const scrollRef = useRef<HTMLDivElement>(null)
  // Số tin nhắn đã có tại thời điểm mở panel — chỉ những tin này được stagger
  // khi mở lại; tin nhắn mới gửi/nhận sau đó xuất hiện ngay không trễ.
  const replayCount = useRef(0)

  // Hiển thị lời chào lần đầu tiên khi panel được mở.
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

    // Các lệnh cục bộ — xử lý phía client, không gọi API.
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

  /** Mở panel và ghi lại mốc stagger cho các tin nhắn hiện có. */
  function openPanel() {
    replayCount.current = messages.length
    setOpen(true)
  }

  return (
    <>
      {/* Nút FAB tròn khi thu gọn — trôi nhẹ + quầng sáng thở */}
      <AnimatePresence>
        {!open && (
          <motion.div
            key="chat-fab"
            initial={{ scale: 0, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 8, transition: { duration: 0.15, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <div className="relative animate-float">
              {/* Quầng sáng lan toả phía sau nút */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-sky-400/45 blur-lg animate-pulse-soft"
              />
              <button
                onClick={openPanel}
                aria-label={t('chat.fabLabel')}
                className="group relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-primary-600 text-white shadow-glow transition-[transform,box-shadow] duration-200 hover:scale-105 hover:shadow-glow-lg active:scale-95"
              >
                <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/25" />
                <MessageCircle
                  size={24}
                  className="transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110"
                />
                <Sparkles size={11} aria-hidden className="absolute right-2 top-2 text-sky-100/90" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel chat khi mở rộng — spring nở ra từ góc dưới phải */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16, transition: { duration: 0.18, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{ transformOrigin: 'bottom right' }}
            role="dialog"
            aria-label={t('chat.title')}
            className="fixed bottom-6 right-6 z-[90] flex h-[70vh] max-h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-black/5"
          >
            {/* Phần đầu — navy gradient + hai orb trang trí tạo chiều sâu + chấm "online" */}
            <div className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 px-4 py-3.5 text-white shadow-inner-highlight-dark">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-sky-500/25 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-10 -left-6 h-20 w-20 rounded-full bg-cyan-400/15 blur-2xl"
              />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-primary-600 shadow-glow ring-1 ring-white/20">
                <Bot size={17} />
              </div>
              <div className="relative leading-tight">
                <p className="font-display text-sm font-bold">{t('chat.title')}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-navy-300">
                  <span aria-hidden className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-success-500 animate-ping-soft" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-success-400 animate-pulse-soft" />
                  </span>
                  {t('chat.subtitle')}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="relative ml-auto cursor-pointer rounded-lg p-1.5 text-navy-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Danh sách tin nhắn — bong bóng nảy vào theo hướng người gửi, stagger khi mở lại panel */}
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-gray-50 p-4"
            >
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, x: m.role === 'user' ? 12 : -12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 480,
                    damping: 34,
                    delay: i < replayCount.current ? Math.min(i * 0.05, 0.35) : 0,
                  }}
                  className={cn(
                    'flex items-end gap-2',
                    m.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {m.role === 'assistant' && <BotTile />}
                  <div
                    className={cn(
                      'max-w-[80%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2 text-sm',
                      m.role === 'user'
                        ? 'rounded-br-md bg-gradient-to-br from-sky-500 to-primary-600 text-white shadow-[0_4px_14px_-4px_rgba(14,165,233,0.5)]'
                        : 'rounded-bl-md bg-white text-gray-700 shadow-sm ring-1 ring-black/5',
                    )}
                  >
                    {m.text}
                    {m.provider && m.provider !== 'MOCK' && (
                      <span className="mt-1.5 flex items-center gap-1 text-[9px] font-medium uppercase tracking-widest text-gray-400">
                        <Sparkles size={9} aria-hidden />
                        {m.provider}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Chỉ báo đang trả lời — ba chấm nảy lần lượt */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="flex items-end gap-2"
                  >
                    <BotTile />
                    <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-sm ring-1 ring-black/5">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="h-1.5 w-1.5 rounded-full bg-primary-500"
                          animate={{ y: [0, -3.5, 0], opacity: [0.45, 1, 0.45] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.7,
                            ease: 'easeInOut',
                            delay: d * 0.12,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chân panel — gợi ý nhanh + ô nhập chung một vạch ngăn mảnh */}
            <div className="border-t border-gray-100 bg-white">
              {/* Gợi ý trả lời nhanh — hiển thị ở màn hình chào; ô nhập tự do luôn được giữ lại */}
              {messages.length <= 1 && !isLoading && (
                <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
                  {SUGGESTIONS.map((key, idx) => (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut', delay: 0.2 + idx * 0.05 }}
                      onClick={() => void send(t(key))}
                      className="cursor-pointer rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[11px] font-medium text-primary-700 transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-100"
                    >
                      {t(key)}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Ô nhập — focus ring đồng bộ foundation + bộ đếm khi gần chạm giới hạn 500 ký tự */}
              <div className="flex items-center gap-2 p-3">
                <div className="relative flex-1">
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
                    className={cn(
                      'h-10 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-navy-900 placeholder:text-gray-400 transition-[border-color,box-shadow] duration-200 hover:border-gray-300 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25',
                      input.length > 400 && 'pr-14',
                    )}
                  />
                  {input.length > 400 && (
                    <span
                      aria-hidden
                      className={cn(
                        'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums',
                        input.length >= 500 ? 'text-warning-600' : 'text-gray-400',
                      )}
                    >
                      {input.length}/500
                    </span>
                  )}
                </div>
                <button
                  onClick={() => void send(input)}
                  disabled={isLoading || !input.trim()}
                  aria-label={t('chat.send')}
                  className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-primary-600 text-white shadow-sm transition-[transform,box-shadow,opacity] duration-200 hover:shadow-glow active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {/* Icon máy bay giấy nhích chéo nhẹ khi hover — chỉ transform, không đổi layout */}
                  <Send
                    size={16}
                    className="transition-transform duration-200 group-enabled:group-hover:-translate-y-0.5 group-enabled:group-hover:translate-x-0.5"
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
