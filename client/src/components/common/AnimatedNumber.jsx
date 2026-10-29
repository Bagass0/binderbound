import { AnimatePresence, motion } from 'motion/react';
import { EASE_OUT } from '../../lib/motion.js';

/** Nombre qui « roule » verticalement quand sa valeur change. */
export function AnimatedNumber({ value, className }) {
  return (
    <span
      className={className}
      style={{ display: 'inline-grid', overflow: 'hidden', verticalAlign: 'bottom' }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
