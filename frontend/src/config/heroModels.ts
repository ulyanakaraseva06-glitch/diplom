export type HeroModel = {
  id: string;
  name: string;
  /** Имя файла в public/assets/models или URL от webpack */
  file: string;
  tagline?: string;
};

const MODELS_BASE = `${process.env.PUBLIC_URL}/assets/models`;

export const HERO_MODEL_STORAGE_KEY = 'selected_hero_model_id';

export const FALLBACK_HERO_MODELS: HeroModel[] = [
  {
    id: 'lunox-wiki',
    name: 'Lunox',
    file: 'https://static.wikia.nocookie.net/mobile-legends-adventure/images/4/4a/Lunox.png/revision/latest/scale-to-width-down/800?cb=20211023161223',
    tagline: 'Twilight Goddess · MLBB',
  },
];

/** Подпись героя в UI (PUBG — всегда «pubg»). */
export function heroDisplayName(model: HeroModel): string {
  if (model.id === 'pubg' || model.id === 'pubg-fone') return 'pubg';
  return model.name;
}

export function heroModelImageUrl(model: HeroModel): string {
  if (
    model.file.startsWith('http') ||
    model.file.startsWith('data:') ||
    model.file.startsWith('blob:') ||
    model.file.includes('/static/media/')
  ) {
    return model.file;
  }
  if (model.file.startsWith('/')) {
    return model.file;
  }
  return `${MODELS_BASE}/${encodeURIComponent(model.file)}`;
}

export async function fetchHeroModels(): Promise<HeroModel[]> {
  const fromPublic = await fetchModelsFromJson();
  if (fromPublic.length > 0) return fromPublic;
  return FALLBACK_HERO_MODELS;
}

async function fetchModelsFromJson(): Promise<HeroModel[]> {
  try {
    const res = await fetch(`${MODELS_BASE}/models.json?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter((m) => m?.id && m?.file) as HeroModel[];
  } catch {
    return [];
  }
}

export function loadSelectedModelId(): string | null {
  try {
    return localStorage.getItem(HERO_MODEL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveSelectedModelId(id: string): void {
  try {
    localStorage.setItem(HERO_MODEL_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function resolveSelectedModel(models: HeroModel[], savedId: string | null): HeroModel {
  if (savedId) {
    const found = models.find((m) => m.id === savedId);
    if (found) return found;
  }
  return models[0] ?? FALLBACK_HERO_MODELS[0];
}
