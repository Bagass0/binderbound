-- Amis, doubles et propositions d'échange.

-- Code ami : partagé à la main pour être ajouté (l'e-mail n'est jamais exposé). Créé à la demande.
ALTER TABLE users ADD COLUMN friend_code CHAR(8) NULL, ADD UNIQUE KEY uq_users_friend_code (friend_code);

-- Une demande d'ami (requester → addressee) devient une amitié une fois acceptée.
CREATE TABLE friendships (
  requester_id INT UNSIGNED NOT NULL,
  addressee_id INT UNSIGNED NOT NULL,
  status ENUM('pending', 'accepted') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (requester_id, addressee_id),
  KEY ix_friendships_addressee (addressee_id),
  CONSTRAINT fk_friendships_requester FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_friendships_addressee FOREIGN KEY (addressee_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Doubles : cartes possédées en plus d'un exemplaire, proposées à l'échange.
CREATE TABLE double_cards (
  user_id INT UNSIGNED NOT NULL,
  set_id VARCHAR(32) NOT NULL,
  card_id VARCHAR(64) NOT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, set_id, card_id),
  CONSTRAINT fk_doubles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;

-- Proposition d'échange entre deux amis, sur un seul set.
CREATE TABLE trades (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proposer_id INT UNSIGNED NOT NULL,
  recipient_id INT UNSIGNED NOT NULL,
  set_id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'cancelled') NOT NULL DEFAULT 'pending',
  message VARCHAR(280) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_trades_proposer (proposer_id, status),
  KEY ix_trades_recipient (recipient_id, status),
  CONSTRAINT fk_trades_proposer FOREIGN KEY (proposer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_trades_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Cartes d'un échange : `giver_id` est celui des deux qui la donne.
CREATE TABLE trade_items (
  trade_id INT UNSIGNED NOT NULL,
  giver_id INT UNSIGNED NOT NULL,
  card_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (trade_id, giver_id, card_id),
  CONSTRAINT fk_trade_items_trade FOREIGN KEY (trade_id) REFERENCES trades (id) ON DELETE CASCADE
) ENGINE=InnoDB;
