/**
 * Сканирует frontend/public/assets/models и записывает models.json
 * Запускается перед npm start / npm run build
 */
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'public', 'assets', 'models');
const JSON_PATH = path.join(MODELS_DIR, 'models.json');
const IMG_EXT = /\.(png|jpe?g|webp|gif)$/i;

function slugify(name, index) {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `hero-${index + 1}`;
}

function main() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(MODELS_DIR)
    .filter((f) => IMG_EXT.test(f))
    .sort((a, b) => a.localeCompare(b, 'ru'));

  const models = files.map((file, index) => {
    const base = path.basename(file, path.extname(file));
    return {
      id: slugify(base, index),
      name: base,
      file,
      tagline: 'MLBB',
    };
  });

  if (models.length === 0) {
    console.warn('');
    console.warn('[sync-hero-models] В папке нет картинок:');
    console.warn('  ', MODELS_DIR);
    console.warn('Положите файлы .png / .jpg / .webp и снова запустите npm start');
    console.warn('');
    return;
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(models, null, 2), 'utf8');
  console.log(`[sync-hero-models] Найдено ${models.length} модель(ей), обновлён models.json`);
  models.forEach((m) => console.log(`  • ${m.file} → ${m.name}`));
}

main();
