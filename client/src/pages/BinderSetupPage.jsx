import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useConfig } from '../hooks/useConfig.js';
import { useLayout } from '../hooks/useLayout.js';
import { useLayoutParams } from '../hooks/useLayoutParams.js';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { StepActions } from '../components/common/StepActions.jsx';
import { LiveEstimate } from '../components/common/LiveEstimate.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { GridPreview } from '../components/binder/GridPreview.jsx';
import { AnimatedNumber } from '../components/common/AnimatedNumber.jsx';
import { SetEyebrow } from '../components/common/SetEyebrow.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { Divider, NumberStepper, Toggle } from '../components/ui/controls.jsx';
import styles from './BinderSetupPage.module.css';

export default function BinderSetupPage() {
  const { t } = useTranslation();
  const { params, update, search } = useLayoutParams();
  const { data: config, error } = useConfig();
  const { data: layout } = useLayout(params, config);

  const presets = config?.binderPresets ?? [];
  const matchingPreset = presets.find((p) => p.rows === params.rows && p.cols === params.cols);
  const [customOpen, setCustomOpen] = useState(false);
  const isCustom = customOpen || (config && !matchingPreset);

  if (error) return <ErrorMessage error={error} />;
  if (!config) return <Loading />;
  const limits = config.gridLimits;

  return (
    <>
      <PageHeading eyebrow={<SetEyebrow setId={params.setId} />} title={t('binder.title')}>
        {t('binder.lead')}
      </PageHeading>

      <div className={styles.layout}>
        <div className={styles.side}>
          <Panel title={t('binder.format')} subtitle={t('binder.formatHint')}>
            <div className={styles.presets} role="radiogroup" aria-label={t('binder.format')}>
              {presets.map((preset) => {
                const active = !isCustom && preset.id === matchingPreset?.id;
                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`${styles.preset} ${active ? styles.active : ''}`}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setCustomOpen(false);
                      update({ rows: preset.rows, cols: preset.cols });
                    }}
                  >
                    <GridPreview rows={preset.rows} cols={preset.cols} active={active} />
                    <span className={styles.presetName}>{preset.id.replace('x', ' × ')}</span>
                    <span className={styles.presetHint}>
                      {t('binder.perFace', { count: preset.rows * preset.cols })}
                    </span>
                  </motion.button>
                );
              })}
              <motion.button
                type="button"
                role="radio"
                aria-checked={isCustom}
                className={`${styles.preset} ${isCustom ? styles.active : ''}`}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCustomOpen(true)}
              >
                <span className={styles.customIcon} aria-hidden>
                  ✦
                </span>
                <span className={styles.presetName}>{t('binder.custom')}</span>
                <span className={styles.presetHint}>{t('binder.customHint')}</span>
              </motion.button>
            </div>

            <AnimatePresence initial={false}>
              {isCustom && (
                <motion.div
                  className={styles.custom}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.customInner}>
                    <NumberStepper
                      label={t('binder.rows')}
                      value={params.rows}
                      min={limits.min}
                      max={limits.max}
                      onChange={(rows) => update({ rows })}
                    />
                    <NumberStepper
                      label={t('binder.cols')}
                      value={params.cols}
                      min={limits.min}
                      max={limits.max}
                      onChange={(cols) => update({ cols })}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Divider />

            <div className={styles.fields}>
              <Toggle
                label={t('binder.doubleSided')}
                description={t('binder.doubleSidedHint')}
                checked={params.doubleSided}
                onChange={(doubleSided) => update({ doubleSided })}
              />
            </div>
          </Panel>

          {layout && (
            <Panel title={t('binder.sheetsTitle')}>
              <p className={styles.needed} aria-live="polite">
                <AnimatedNumber value={layout.summary.sheetsUsed} className={styles.neededValue} />
                <span>{t('summary.sheets', { count: layout.summary.sheetsUsed })}</span>
              </p>
              <p className={styles.neededHint}>
                {t('binder.sheetsHint', {
                  cards: layout.summary.totalCards,
                  count: layout.summary.cardFaces,
                })}
              </p>
            </Panel>
          )}
        </div>

        <Panel className={styles.previewPanel} title={t('binder.preview')}>
          <div className={styles.binder}>
            {params.doubleSided && (
              <div className={`${styles.page} ${styles.left}`}>
                <GridPreview rows={params.rows} cols={params.cols} size="lg" />
                <span className={styles.pageLabel}>{t('side.verso')}</span>
              </div>
            )}
            <div className={styles.spine} aria-hidden />
            <div className={styles.page}>
              <GridPreview rows={params.rows} cols={params.cols} size="lg" active />
              <span className={styles.pageLabel}>{t('side.recto')}</span>
            </div>
          </div>
          <p className={styles.previewCaption}>
            {t('binder.previewCaption', {
              rows: params.rows,
              cols: params.cols,
              count: params.rows * params.cols,
            })}
          </p>
        </Panel>
      </div>

      <StepActions back={{ pathname: '/', search }} next={{ pathname: '/options', search }}>
        <LiveEstimate layout={layout} />
      </StepActions>
    </>
  );
}
