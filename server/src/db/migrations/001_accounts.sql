-- Comptes, sessions, classeurs sauvegardés et cartes possédées.

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  name VARCHAR(80) NOT NULL,
  -- NULL pour un compte créé avec Google uniquement
  password_hash VARCHAR(255) NULL,
  google_sub VARCHAR(255) NULL,
  avatar_url VARCHAR(1024) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google (google_sub)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Le jeton de session n'est jamais stocké en clair : `id` est son empreinte SHA-256.
CREATE TABLE sessions (
  id CHAR(64) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_sessions_user (user_id),
  KEY ix_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;

-- `params` reprend les réglages du parcours (format, tri, variantes…), validés par zod.
CREATE TABLE binders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  set_id VARCHAR(32) NOT NULL,
  params JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_binders_user (user_id, updated_at),
  CONSTRAINT fk_binders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Collection : une carte possédée l'est pour tous les classeurs du même set.
CREATE TABLE owned_cards (
  user_id INT UNSIGNED NOT NULL,
  set_id VARCHAR(32) NOT NULL,
  card_id VARCHAR(64) NOT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, set_id, card_id),
  CONSTRAINT fk_owned_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;
