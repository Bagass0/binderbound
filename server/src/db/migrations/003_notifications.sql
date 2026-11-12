-- Liste des joueurs et notifications.

-- Apparaître dans la liste des joueurs (ajout sans code ami). Chacun peut s'en retirer.
ALTER TABLE users ADD COLUMN discoverable BOOLEAN NOT NULL DEFAULT TRUE;

-- Notifications : `actor_id` est celui qui a agi (demande, acceptation…), `trade_id` l'échange concerné.
CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('friend_request', 'friend_accepted', 'trade_received', 'trade_accepted', 'trade_declined', 'trade_cancelled') NOT NULL,
  actor_id INT UNSIGNED NOT NULL,
  trade_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  KEY ix_notifications_user (user_id, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_trade FOREIGN KEY (trade_id) REFERENCES trades (id) ON DELETE CASCADE
) ENGINE=InnoDB;
