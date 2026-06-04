import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Megaphone, Check, X, ChevronRight, Volume2 } from 'lucide-react'
import { Button } from '../../components/ui/button'

export interface RollCallPassenger {
  id: string
  name: string
  status?: 'JOIN' | 'ABSENT'
}

/**
 * Phase E — Điểm danh bằng TTS. Hệ thống đọc to từng tên trong danh sách (dùng
 * SpeechSynthesis của trình duyệt, vi-VN — miễn phí, chạy ON-DEVICE nên hoạt động
 * offline và ổn định trong môi trường ồn) còn BusManager bấm Có mặt / Vắng / Bỏ qua
 * cho từng tên. Giống chế độ STT, nó KHÔNG BAO GIỜ tự động điểm danh: mỗi hành khách
 * đều cần một thao tác bấm chủ động của tài xế, nhờ đó quyền điểm danh vẫn thuộc về BusManager.
 */
export default function RollCall({
  passengers,
  onMark,
  disabled,
}: {
  passengers: RollCallPassenger[]
  onMark: (id: string, status: 'JOIN' | 'ABSENT') => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const current = active ? passengers[index] : undefined

  function speak(name: string) {
    if (!supported) return
    const u = new SpeechSynthesisUtterance(name)
    u.lang = 'vi-VN'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  // Đọc to tên hiện tại mỗi khi con trỏ di chuyển.
  useEffect(() => {
    if (active && current) speak(current.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index])

  function stop() {
    setActive(false)
    if (supported) window.speechSynthesis.cancel()
  }

  // Bảo vệ: nếu danh sách bị thu nhỏ (do peer refetch) vượt quá con trỏ thì kết thúc một cách an toàn.
  useEffect(() => {
    if (active && !current) stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, current])

  function start() {
    if (!passengers.length) return
    setIndex(0)
    setActive(true)
  }

  function advance() {
    if (index + 1 >= passengers.length) stop()
    else setIndex((i) => i + 1)
  }

  function mark(status: 'JOIN' | 'ABSENT') {
    if (current) onMark(current.id, status)
    advance()
  }

  return (
    <div className="px-4 pb-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 bg-white border-primary-600/30 text-primary-600 text-xs"
        onClick={start}
        disabled={disabled || !passengers.length}
      >
        <Megaphone size={14} /> {t('rollcall.button')}
      </Button>

      <AnimatePresence>
        {active && current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {t('rollcall.title')}
                </span>
                <button onClick={stop} className="p-1 text-gray-400" aria-label={t('common.cancel')}>
                  <X size={18} />
                </button>
              </div>

              <p className="mb-2 text-center text-[11px] font-bold text-gray-400">
                {index + 1} / {passengers.length}
              </p>

              <button
                onClick={() => speak(current.name)}
                className="mx-auto mb-1 flex items-center justify-center gap-2"
                aria-label={t('rollcall.replay')}
              >
                <span className="text-2xl font-extrabold text-primary-600">{current.name}</span>
                {supported && <Volume2 size={18} className="text-primary-400" />}
              </button>
              <p className="mb-5 text-center text-[11px] text-gray-400">
                {current.status
                  ? t('rollcall.current', { status: t(`status.${current.status}`) })
                  : t('rollcall.replay')}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => mark('JOIN')}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-success-600 text-sm font-bold text-white transition-all hover:bg-success-600/90 active:scale-[0.98]"
                >
                  <Check size={18} /> {t('rollcall.present')}
                </button>
                <button
                  onClick={() => mark('ABSENT')}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-warning-500 text-sm font-bold text-white transition-all hover:bg-warning-500/90 active:scale-[0.98]"
                >
                  <X size={18} /> {t('rollcall.absent')}
                </button>
              </div>
              <button
                onClick={advance}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-gray-200 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
              >
                {t('rollcall.skip')} <ChevronRight size={14} />
              </button>

              {!supported && (
                <p className="mt-3 text-center text-[10px] text-gray-400">{t('rollcall.noAudio')}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
