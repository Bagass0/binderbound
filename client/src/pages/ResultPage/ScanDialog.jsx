import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { CONFIDENT, createMatcher, guideRect } from '../../lib/scan.js';
import { cardNumber, isVariant, localizedName } from '../../lib/format.js';
import { cardImage } from '../../lib/images.js';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PlacementGuide } from '../../components/binder/PlacementGuide.jsx';
import { PriceTag } from '../../components/common/PriceTag.jsx';
import { Check, Scan } from '../../components/icons/Icons.jsx';
import styles from './ScanDialog.module.css';

/** Intervalle entre deux analyses de l'image de la caméra. */
const INTERVAL = 300;
/** Analyses consécutives d'accord avant d'afficher la carte. */
const STABLE = 3;

/**
 * Scan d'une carte : la caméra (ou une photo) identifie la carte, puis la fenêtre indique où
 * la ranger et propose de l'ajouter à la collection. Le contenu n'est monté que fenêtre
 * ouverte : la caméra s'éteint dès la fermeture.
 */
export function ScanDialog({ open, onClose, ...props }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} title={t('scan.title')} className={styles.dialog}>
      <ScanContent {...props} onClose={onClose} />
    </Dialog>
  );
}

function ScanContent({ set, layout, prices, collection, onLocate, onClose }) {
  const { t } = useTranslation();
  const { data: fingerprints, error } = useAsync(`fingerprints:${set.id}`, () =>
    api.fingerprints(set.id),
  );
  const matcher = useMemo(
    () => fingerprints && createMatcher(fingerprints, set.cards),
    [fingerprints, set.cards],
  );
  const [ranked, setRanked] = useState(null); // résultat : cartes classées par ressemblance

  if (error || matcher?.size === 0)
    return <p className={styles.message}>{t('scan.unavailable')}</p>;
  if (!matcher) return <p className={styles.message}>{t('scan.loading')}</p>;
  if (!ranked) return <Camera matcher={matcher} onResult={setRanked} />;
  return (
    <ScanResult
      ranked={ranked}
      layout={layout}
      prices={prices}
      setCode={set.code}
      collection={collection}
      onAgain={() => setRanked(null)}
      onLocate={(card) => {
        onClose();
        onLocate(card);
      }}
    />
  );
}

/** Carte de référence d'un classement : variantes d'une même illustration regroupées. */
const artKey = (card) => card.baseCardId ?? card.id;

function Camera({ matcher, onResult }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const latest = useRef(null);
  const fileRef = useRef(null);
  const [size, setSize] = useState(null); // dimensions de la vidéo
  const [cameraError, setCameraError] = useState(!navigator.mediaDevices);

  // Caméra arrière si possible ; coupée au démontage.
  useEffect(() => {
    let stream;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      .then((s) => {
        stream = s;
        if (cancelled) return s.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = s;
      })
      .catch(() => !cancelled && setCameraError(true));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Analyse continue : la carte s'affiche quand plusieurs images de suite s'accordent.
  useEffect(() => {
    if (!size) return;
    let streak = 0;
    let previous = null;
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || document.hidden) return;
      const result = matcher.match(matcher.sample(video, guideRect(size.width, size.height)));
      latest.current = result;
      const key = artKey(result[0].card);
      streak = key === previous ? streak + 1 : 1;
      previous = key;
      if (result[0].score >= CONFIDENT && streak >= STABLE) onResult(result);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [size, matcher, onResult]);

  // Photo choisie : la carte est supposée cadrer l'image, au centre.
  const fromPhoto = async (file) => {
    if (!file) return;
    const bitmap = await createImageBitmap(file);
    const rect = guideRect(bitmap.width, bitmap.height, { fill: 0.95, maxWidth: 0.95 });
    onResult(matcher.match(matcher.sample(bitmap, rect)));
    bitmap.close();
  };

  const guide = size && guideRect(size.width, size.height);
  const percent = (value, total) => `${(value / total) * 100}%`;

  return (
    <div className={styles.camera}>
      {cameraError ? (
        <p className={styles.message}>{t('scan.noCamera')}</p>
      ) : (
        <div
          className={styles.viewport}
          style={size ? { '--ratio': size.width / size.height } : undefined}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={(e) =>
              setSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
            }
          />
          {guide && (
            <span
              className={styles.guide}
              style={{
                left: percent(guide.x, size.width),
                top: percent(guide.y, size.height),
                width: percent(guide.width, size.width),
                height: percent(guide.height, size.height),
              }}
            />
          )}
          {size && <span className={styles.status}>{t('scan.searching')}</span>}
        </div>
      )}
      <p className={styles.hint}>{t('scan.hint')}</p>
      <div className={styles.actions}>
        {!cameraError && (
          <Button
            variant="primary"
            icon={<Scan />}
            disabled={!size}
            onClick={() => latest.current && onResult(latest.current)}
          >
            {t('scan.capture')}
          </Button>
        )}
        <Button variant="ghost" onClick={() => fileRef.current.click()}>
          {t('scan.upload')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => fromPhoto(e.target.files[0])}
        />
      </div>
    </div>
  );
}

function ScanResult({ ranked, layout, prices, setCode, collection, onAgain, onLocate }) {
  const { t, i18n } = useTranslation();
  const [card, setCard] = useState(ranked[0].card);
  const owned = collection.owned.has(card.id);

  const add = () => {
    if (!owned) collection.toggle(card.id);
    // On affiche la collection dans le classeur pour que la carte ajoutée y apparaisse.
    collection.setTracking(true);
  };

  return (
    <div className={styles.result}>
      <div className={styles.found}>
        {card.imageUrl && (
          <img
            className={styles.image}
            {...cardImage(card.imageUrl, { sizes: '10rem' })}
            alt={localizedName(card, i18n.language)}
          />
        )}
        <div className={styles.info}>
          <span className={styles.code}>
            {t('scan.found')} · {setCode} #{cardNumber(card)}
          </span>
          <h3 className={styles.name}>{localizedName(card, i18n.language)}</h3>
          <span className={styles.meta}>
            {isVariant(card) && <span>{t(`variant.${card.variant}`)}</span>}
            <PriceTag prices={prices} card={card} className={styles.price} />
          </span>
          {card.id === ranked[0].card.id && ranked[0].score < CONFIDENT && (
            <p className={styles.unsure}>{t('scan.unsure')}</p>
          )}
        </div>
      </div>

      <PlacementGuide layout={layout} card={card} />

      <div className={styles.actions}>
        <Button
          variant={owned ? 'secondary' : 'primary'}
          icon={owned ? <Check /> : undefined}
          onClick={add}
          disabled={owned && collection.tracking}
        >
          {owned ? t('scan.added') : t('scan.addToCollection')}
        </Button>
        {layout.index[card.id] && (
          <Button onClick={() => onLocate(card)}>{t('scan.showInBinder')}</Button>
        )}
        <Button variant="ghost" icon={<Scan />} onClick={onAgain}>
          {t('scan.again')}
        </Button>
      </div>

      <div className={styles.others}>
        <span>{t('scan.notThis')}</span>
        <ul>
          {ranked
            .filter((r) => r.card.id !== card.id)
            .slice(0, 5)
            .map(({ card: other }) => (
              <li key={other.id}>
                <button
                  type="button"
                  onClick={() => setCard(other)}
                  title={`#${cardNumber(other)} ${localizedName(other, i18n.language)}`}
                >
                  {other.imageUrl ? (
                    <img {...cardImage(other.imageUrl, { sizes: '3.5rem' })} alt="" />
                  ) : (
                    <span>#{cardNumber(other)}</span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
