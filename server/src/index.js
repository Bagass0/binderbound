import { createApp } from './app.js';
import { createSetRepository, loadSets } from './services/setRepository.js';

const PORT = Number(process.env.PORT) || 3001;
const STATIC_DIR = process.env.STATIC_DIR || undefined;

const sets = await loadSets();
const app = createApp(createSetRepository(sets), { staticDir: STATIC_DIR });

app.listen(PORT, () => {
  console.log(`Binderbound API → http://localhost:${PORT} (${sets.size} set(s) chargé(s))`);
});
