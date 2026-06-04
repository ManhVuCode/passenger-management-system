import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Fuse from 'fuse.js'
import { motion, AnimatePresence } from 'motion/react'
import { Mic } from 'lucide-react'
import { Button } from '../../components/ui/button'

/** Minimal Web Speech API typings (not in the DOM lib) — avoids `any`. */
interface SpeechAlternative {
  transcript: string
}
interface SpeechResultList {
  readonly length: number
  [index: number]: { readonly length: number; [index: number]: SpeechAlternative }
}
interface SpeechRecognitionEventLike {
  results: SpeechResultList
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export interface VoicePassenger {
  id: string
  name: string
}

/**
 * Voice check-in MVP (post-MVP per report §7.7): the BusManager speaks a name,
 * we fuzzy-match it against the bus roster and PROPOSE a JOIN. The driver always
 * confirms — we never auto-mark, so BusManager attendance authority is preserved.
 * Uses the free, on-device browser Web Speech API (vi-VN); a cloud ASR is the
 * documented upgrade path for noisy environments.
 */
export default function VoiceAttendance({
  passengers,
  onConfirm,
  disabled,
}: {
  passengers: VoicePassenger[]
  onConfirm: (id: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [listening, setListening] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [match, setMatch] = useState<VoicePassenger | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const fuse = useMemo(
    () => new Fuse(passengers, { keys: ['name'], threshold: 0.5, includeScore: true }),
    [passengers],
  )

  function flash(msg: string) {
    setMessage(msg)
    window.setTimeout(() => setMessage(null), 4000)
  }

  function handleMic() {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) {
      flash(t('voice.unsupported'))
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'vi-VN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false
    recognitionRef.current = recognition

    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim() ?? ''
      if (!transcript) {
        flash(t('voice.error'))
        return
      }
      const results = fuse.search(transcript)
      const best = results[0]
      if (best && (best.score == null || best.score <= 0.6)) {
        setMatch(best.item)
      } else {
        flash(t('voice.noMatch', { text: transcript }))
      }
    }
    recognition.onerror = () => flash(t('voice.error'))
    recognition.onend = () => setListening(false)

    try {
      recognition.start()
      setListening(true)
      setMessage(null)
    } catch {
      flash(t('voice.error'))
    }
  }

  function confirmMatch() {
    if (match) onConfirm(match.id)
    setMatch(null)
  }

  return (
    <div className="px-4 pb-2">
      <Button
        variant="outline"
        size="sm"
        className={cnBtn(listening)}
        onClick={handleMic}
        disabled={disabled || listening}
      >
        <Mic size={14} className={listening ? 'animate-pulse' : ''} />
        {listening ? t('voice.listening') : t('voice.button')}
      </Button>
      {message && <p className="mt-1.5 text-center text-[11px] text-gray-500">{message}</p>}

      <AnimatePresence>
        {match && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onClick={() => setMatch(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                  <Mic size={22} className="text-primary-600" />
                </div>
              </div>
              <h2 className="mb-1 text-center font-bold text-gray-950">{t('voice.confirmTitle')}</h2>
              <p className="mb-6 text-center text-lg font-extrabold text-primary-600">{match.name}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMatch(null)}
                  className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {/* reuse common cancel label from shared i18n namespace */}
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmMatch}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-success-600 text-sm font-bold text-white transition-all hover:bg-success-600/90 active:scale-[0.98]"
                >
                  {t('voice.confirmJoin')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function cnBtn(listening: boolean): string {
  return [
    'w-full gap-2 text-xs bg-white',
    listening ? 'border-primary-600 text-primary-600' : 'border-primary-600/30 text-primary-600',
  ].join(' ')
}
