import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../auth/useAuth.js';
import { GoogleButton } from '../components/auth/GoogleButton.jsx';
import { PageHeading } from '../components/common/PageHeading.jsx';
import { Loading } from '../components/common/StatusMessage.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { Segmented } from '../components/ui/controls.jsx';
import styles from './LoginPage.module.css';

/** Destination après connexion : uniquement un chemin interne (pas de redirection ouverte). */
const safeNext = (next) => (next?.startsWith('/') && !next.startsWith('//') ? next : '/binders');

export default function LoginPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  if (auth.status === 'loading') return <Loading />;
  if (!auth.enabled) return <Navigate to="/" replace />;
  if (auth.user) return <Navigate to={next} replace />;

  const run = async (action) => {
    setPending(true);
    setError(null);
    try {
      await action();
      navigate(next, { replace: true });
    } catch (err) {
      setError(err);
      setPending(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run(() => (mode === 'login' ? auth.login(form.email, form.password) : auth.register(form)));
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    error: fieldError(t, error, key),
  });

  const formError =
    error &&
    !error.details?.length &&
    t(`auth.error.${error.code}`, {
      defaultValue: t('auth.error.default'),
    });

  return (
    <div className={styles.page}>
      <PageHeading eyebrow={t('auth.eyebrow')} title={t(`auth.title.${mode}`)}>
        {t('auth.lead')}
      </PageHeading>

      <Panel className={styles.panel}>
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          options={[
            { value: 'login', label: t('auth.mode.login') },
            { value: 'register', label: t('auth.mode.register') },
          ]}
        />

        {auth.googleClientId && (
          <>
            <GoogleButton
              clientId={auth.googleClientId}
              onCredential={(credential) => run(() => auth.loginWithGoogle(credential))}
            />
            <div className={styles.or}>
              <span>{t('auth.or')}</span>
            </div>
          </>
        )}

        <form className={styles.form} onSubmit={submit} noValidate>
          <AnimatePresence initial={false}>
            {mode === 'register' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={styles.collapsible}
              >
                <TextField
                  label={t('auth.name')}
                  autoComplete="nickname"
                  maxLength={80}
                  required
                  {...field('name')}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <TextField
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            required
            {...field('email')}
          />
          <TextField
            label={t('auth.password')}
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            hint={mode === 'register' ? t('auth.passwordHint') : undefined}
            minLength={mode === 'register' ? 8 : undefined}
            required
            {...field('password')}
          />

          <AnimatePresence>
            {formError && (
              <motion.p
                role="alert"
                className={styles.error}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {formError}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" variant="primary" disabled={pending}>
            {t(`auth.submit.${mode}`)}
          </Button>
        </form>
      </Panel>

      <p className={styles.note}>{t('auth.guestNote')}</p>
    </div>
  );
}

/** Message d'erreur de validation (renvoyé par le serveur) pour un champ du formulaire. */
function fieldError(t, error, key) {
  const issue = error?.details?.find((d) => d.path === key);
  return issue ? t(`auth.invalid.${key}`) : undefined;
}
