import { Router } from 'express';
import { requireUser } from '../middleware/session.js';

/** Notifications de l'utilisateur (cloche du header). */
export function notificationsRouter({ notifications }) {
  const router = Router();
  router.use(requireUser);

  router.get('/', async (req, res) => {
    const [list, unread] = await Promise.all([
      notifications.list(req.user.id),
      notifications.unreadCount(req.user.id),
    ]);
    res.json({ notifications: list, unread });
  });

  /** Nombre de non lues : interrogé régulièrement pour la pastille de la cloche. */
  router.get('/count', async (req, res) => {
    res.json({ unread: await notifications.unreadCount(req.user.id) });
  });

  router.post('/read', async (req, res) => {
    await notifications.markAllRead(req.user.id);
    res.status(204).end();
  });

  return router;
}
