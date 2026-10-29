import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useConfig, useSet } from '../hooks/useConfig.js';
import { useLayout } from '../hooks/useLayout.js';
import { canBreakBy, useLayoutParams } from '../hooks/useLayoutParams.js';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { StepActions } from '../components/common/StepActions.jsx';
import { LiveEstimate } from '../components/common/LiveEstimate.jsx';
import { ErrorMessage, Loading } from '../components/common/StatusMessage.jsx';
import { GridPreview } from '../components/binder/GridPreview.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import {
  Checkbox,
  ChoiceCards,
  NumberStepper,
  Segmented,
  Toggle,
} from '../components/ui/controls.jsx';
import styles from './OptionsPage.module.css';

/** Mini-schéma illustrant chaque mode de variantes (B = base, V = variante). */
const VARIANT_VISUALS = {
  'after-base': ['base', 'variant', 'base', 'base', 'variant', 'base'],
  end: ['base', 'base', 'base', 'base', 'variant', 'variant'],
  exclude: ['base', 'base', 'base', 'base', 'empty', 'empty'],
};

export default function OptionsPage() {
  const { t } = useTranslation();
  const { params, update, search } = useLayoutParams();
  const { data: config, error } = useConfig();
  const { data: set } = useSet(params.setId);
  const { data: layout } = useLayout(params, config);

  // Nombre de cartes du set par type de variante, affiché à côté des cases à cocher.
  const variantCounts = useMemo(() => {
    const counts = {};
    for (const card of set?.cards ?? []) counts[card.variant] = (counts[card.variant] ?? 0) + 1;
    return counts;
  }, [set]);

  if (error) return <ErrorMessage error={error} />;
  if (!config) return <Loading />;

  const included = params.includedVariants ?? config.variantTypes;
  const toggleVariant = (variant, checked) => {
    const next = config.variantTypes.filter((v) =>
      v === variant ? checked : included.includes(v),
    );
    // Toutes cochées = valeur par défaut : on retire le paramètre de l'URL.
    update({ includedVariants: next.length === config.variantTypes.length ? null : next });
  };
  const canBreak = canBreakBy(params.sortBy, config);

  return (
    <>
      <PageHeading eyebrow={t('steps.options')} title={t('options.title')}>
        {t('options.lead')}
      </PageHeading>

      <div className={styles.layout}>
        <Panel title={t('options.sorting')}>
          <div className={styles.stack}>
            <Segmented
              label={t('options.sortBy')}
              value={params.sortBy}
              onChange={(sortBy) => update({ sortBy })}
              options={config.sortOptions.map((value) => ({ value, label: t(`sort.${value}`) }))}
            />
            <Toggle
              label={
                canBreak
                  ? t('options.breakBy', { group: t(`groupBy.${params.sortBy}`) })
                  : t('options.breakByDisabled')
              }
              description={canBreak ? t('options.breakByHint') : t('options.breakByDisabledHint')}
              checked={canBreak && params.breakByGroup}
              disabled={!canBreak}
              onChange={(breakByGroup) => update({ breakByGroup })}
            />
          </div>
        </Panel>

        <Panel title={t('options.variants')}>
          <div className={styles.stack}>
            <ChoiceCards
              label={t('options.variantMode')}
              value={params.variantMode}
              onChange={(variantMode) => update({ variantMode })}
              options={config.variantModes.map((value) => ({
                value,
                label: t(`variantMode.${value}.label`),
                description: t(`variantMode.${value}.hint`),
                visual: <GridPreview rows={1} cols={6} size="sm" cells={VARIANT_VISUALS[value]} />,
              }))}
            />

            <AnimatePresence initial={false}>
              {params.variantMode !== 'exclude' && (
                <motion.fieldset
                  className={styles.variants}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <legend className={styles.legend}>{t('options.includedVariants')}</legend>
                  <div className={styles.checks}>
                    {config.variantTypes.map((variant) => (
                      <Checkbox
                        key={variant}
                        checked={included.includes(variant)}
                        onChange={(checked) => toggleVariant(variant, checked)}
                        label={
                          <>
                            {t(`variant.${variant}`)}
                            <span className={styles.count}>{variantCounts[variant] ?? 0}</span>
                          </>
                        }
                      />
                    ))}
                  </div>
                </motion.fieldset>
              )}
            </AnimatePresence>
          </div>
        </Panel>

        <Panel title={t('options.start')}>
          <div className={styles.stack}>
            <NumberStepper
              label={t('options.reservedFaces')}
              description={t('options.reservedFacesHint')}
              value={params.reservedFaces}
              min={0}
              max={50}
              onChange={(reservedFaces) => update({ reservedFaces })}
            />
            <Toggle
              label={t('options.startOnRight')}
              description={
                params.doubleSided ? t('options.startOnRightHint') : t('options.startOnRightSingle')
              }
              checked={params.startOnRight}
              disabled={!params.doubleSided}
              onChange={(startOnRight) => update({ startOnRight })}
            />
          </div>
        </Panel>
      </div>

      <StepActions
        back={{ pathname: '/binder', search }}
        next={{ pathname: '/result', search }}
        nextLabel={t('options.compute')}
      >
        <LiveEstimate layout={layout} />
      </StepActions>
    </>
  );
}
