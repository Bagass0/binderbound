import { useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { EASE_OUT } from '../../lib/motion.js';
import { Header } from './Header.jsx';
import { Footer } from './Footer.jsx';
import { Stepper } from './Stepper.jsx';
import { stepIndex } from './steps.js';
import styles from './AppLayout.module.css';

const pageVariants = {
  enter: (dir) => ({ opacity: 0, x: dir * 48, filter: 'blur(6px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (dir) => ({ opacity: 0, x: dir * -48, filter: 'blur(6px)' }),
};

export function AppLayout() {
  const { pathname } = useLocation();
  const outlet = useOutlet();

  // Sens de la transition : vers la droite quand on avance dans les étapes.
  const index = stepIndex(pathname);
  const [nav, setNav] = useState({ pathname, index, dir: 1 });
  if (nav.pathname !== pathname) {
    setNav({ pathname, index, dir: index >= nav.index ? 1 : -1 });
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <Header />
      <Stepper current={index} />
      <div className={styles.stage}>
        <AnimatePresence mode="wait" custom={nav.dir} initial={false}>
          <motion.main
            key={pathname}
            className={styles.main}
            custom={nav.dir}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            {outlet}
          </motion.main>
        </AnimatePresence>
      </div>
      <Footer />
    </MotionConfig>
  );
}
