import * as React from 'react'
import { AnimatePresence, motion } from 'motion/react'

export interface TabTransitionProps {
  /** Unique key for the active tab/panel. Changing it triggers the transition. */
  tabKey: string | number
  children: React.ReactNode
  className?: string
}

/**
 * Wraps tab/panel content so switching tabs animates consistently across Web + PWA:
 * opacity 0→1, translateY 8px→0, 200ms ease-out. `mode="wait"` lets the outgoing
 * panel finish exiting before the incoming one enters.
 */
export function TabTransition({ tabKey, children, className }: TabTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        className={className}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
