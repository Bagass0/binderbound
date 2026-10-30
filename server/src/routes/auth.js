import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../auth/password.js';
import { HttpError } from '../middleware/errorHandler.js';
import { cookieOptions, SESSION_COOKIE } from '../middleware/session.js';
import { publicUser } from '../services/users.js';
import { googleLoginSchema, loginSchema, registerSchema } from '../schemas/account.schema.js';

/** Limite les tentatives de connexion par adresse IP (anti force brute). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) =>
    next(new HttpError(429, 'RATE_LIMITED', 'Trop de tentatives, réessaie plus tard')),
});

export function authRouter({ users, sessions, verifyGoogle, cookieSecure }) {
  const router = Router();

  const startSession = async (res, user, status = 200) => {
    const token = await sessions.create(user.id);
    res.cookie(SESSION_COOKIE, token, cookieOptions(cookieSecure));
    res.status(status).json({ user: publicUser(user) });
  };

  router.get('/me', (req, res) => res.json({ user: req.user ? publicUser(req.user) : null }));

  router.post('/register', authLimiter, async (req, res) => {
    const { email, name, password } = registerSchema.parse(req.body ?? {});
    if (await users.findByEmail(email))
      throw new HttpError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet e-mail');
    const user = await users.create({ email, name, passwordHash: await hashPassword(password) });
    await startSession(res, user, 201);
  });

  router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = loginSchema.parse(req.body ?? {});
    const user = await users.findByEmail(email);
    // Même réponse (et même durée) pour un e-mail inconnu ou un mauvais mot de passe.
    const valid = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
    if (!user?.password_hash || !valid)
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'E-mail ou mot de passe incorrect');
    await startSession(res, user);
  });

  router.post('/google', authLimiter, async (req, res) => {
    if (!verifyGoogle)
      throw new HttpError(404, 'GOOGLE_DISABLED', 'Connexion Google non configurée');
    const { credential } = googleLoginSchema.parse(req.body ?? {});
    const profile = await verifyGoogle(credential);
    if (!profile.email) throw new HttpError(400, 'GOOGLE_NO_EMAIL', 'Compte Google sans e-mail');
    const email = profile.email.toLowerCase();

    let user = await users.findByGoogleSub(profile.sub);
    let created = false;
    if (!user) {
      const existing = await users.findByEmail(email);
      if (existing) {
        // On ne rattache que si Google garantit que l'adresse appartient bien à la personne.
        if (!profile.emailVerified)
          throw new HttpError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet e-mail');
        user = await users.linkGoogle(existing.id, {
          googleSub: profile.sub,
          avatarUrl: profile.picture,
        });
      } else {
        user = await users.create({
          email,
          name: profile.name.slice(0, 80),
          googleSub: profile.sub,
          avatarUrl: profile.picture,
        });
        created = true;
      }
    }
    await startSession(res, user, created ? 201 : 200);
  });

  router.post('/logout', async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) await sessions.destroy(token);
    const { maxAge, ...options } = cookieOptions(cookieSecure);
    res.clearCookie(SESSION_COOKIE, options);
    res.status(204).end();
  });

  return router;
}
