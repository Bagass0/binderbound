-- Exécuté par l'image MySQL à la première initialisation du volume (dev uniquement) :
-- une base séparée pour les tests d'intégration (`npm run test:db`).
CREATE DATABASE IF NOT EXISTS binderbound_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON binderbound_test.* TO 'binderbound'@'%';
