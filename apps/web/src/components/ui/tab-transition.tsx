import * as React from 'react'
import { AnimatePresence, motion } from 'motion/react'

export interface TabTransitionProps {
  /** Key duy nhất cho tab/panel đang active. Thay đổi nó sẽ kích hoạt hiệu ứng chuyển. */
  tabKey: string | number
  children: React.ReactNode
  className?: string
}

/**
 * Bọc nội dung tab/panel để việc chuyển tab có hiệu ứng nhất quán trên Web + PWA:
 * opacity 0→1, translateY 10px→0, ease-out; panel đi ra thoát nhanh hơn để cảm giác gọn.
 * `mode="wait"` cho phép panel đi ra hoàn tất thoát trước khi panel đi vào xuất hiện.
 */
export function TabTransition({ tabKey, children, className }: TabTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        className={className}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6, transition: { duration: 0.12, ease: 'easeIn' } }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
