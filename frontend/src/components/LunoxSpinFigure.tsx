import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Button, Alert, keyframes } from '@mui/material';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChooseHeroModelDialog from './ChooseHeroModelDialog';
import {
  HeroModel,
  fetchHeroModels,
  heroModelImageUrl,
  loadSelectedModelId,
  resolveSelectedModel,
  saveSelectedModelId,
} from '../config/heroModels';

const spinY = keyframes`
  from { transform: rotateY(0deg); }
  to { transform: rotateY(360deg); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

const pulseGlow = keyframes`
  0%, 100% { opacity: 0.45; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.08); }
`;

const orbit = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const imgSx = {
  width: '100%',
  height: '100%',
  objectFit: 'contain' as const,
  objectPosition: 'center center',
  filter:
    'drop-shadow(0 12px 32px rgba(0, 212, 255, 0.35)) drop-shadow(0 0 48px rgba(138, 43, 226, 0.25))',
  backfaceVisibility: 'hidden' as const,
};

const MODELS_FOLDER_HINT = 'frontend/public/assets/models';

const SpinningHeroImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
  <Box
    sx={{
      position: 'absolute',
      inset: 0,
      transformStyle: 'preserve-3d',
      animation: `${spinY} 14s linear infinite`,
    }}
  >
    <Box sx={{ position: 'absolute', inset: 0, transform: 'rotateY(0deg)', transformStyle: 'preserve-3d' }}>
      <Box component="img" src={src} alt="" draggable={false} sx={imgSx} />
    </Box>
    <Box sx={{ position: 'absolute', inset: 0, transform: 'rotateY(180deg)', transformStyle: 'preserve-3d' }}>
      <Box component="img" src={src} alt={alt} draggable={false} sx={imgSx} />
    </Box>
  </Box>
);

const LunoxSpinFigure: React.FC = () => {
  const [models, setModels] = useState<HeroModel[]>([]);
  const [selected, setSelected] = useState<HeroModel | null>(null);
  const [src, setSrc] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  const applyModel = useCallback((model: HeroModel) => {
    setSelected(model);
    setSrc(heroModelImageUrl(model));
    setLoadError('');
    saveSelectedModelId(model.id);
  }, []);

  const reloadModels = useCallback(async () => {
    const list = await fetchHeroModels();
    setModels(list);
    if (list.length === 0) {
      setLoadError(`В папке ${MODELS_FOLDER_HINT} нет картинок. Добавьте .png/.jpg и перезапустите npm start.`);
      return;
    }
    const savedId = loadSelectedModelId();
    const model = resolveSelectedModel(list, savedId);
    applyModel(model);
  }, [applyModel]);

  useEffect(() => {
    reloadModels();
  }, [reloadModels]);

  const handleSelect = (model: HeroModel) => {
    applyModel(model);
  };

  const title = selected?.tagline?.split('·')[0]?.trim() || selected?.name || 'Hero';
  const caption = selected?.tagline || selected?.name || '';

  return (
    <>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 1,
        }}
      >
        <Typography
          variant="overline"
          sx={{
            flexShrink: 0,
            letterSpacing: '0.25em',
            color: 'primary.main',
            fontWeight: 700,
            textAlign: 'center',
            width: '100%',
            pointerEvents: 'none',
          }}
        >
          {title}
        </Typography>

        {loadError && (
          <Alert severity="warning" sx={{ mx: 1, mb: 1, pointerEvents: 'auto', fontSize: '0.75rem' }}>
            {loadError}
          </Alert>
        )}

        <Box
          sx={{
            flex: 1,
            width: '100%',
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {src ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                maxHeight: 'min(70vh, 520px)',
                perspective: '900px',
                animation: `${float} 4.5s ease-in-out infinite`,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '6%',
                  width: '70%',
                  height: 40,
                  ml: '-35%',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(ellipse, rgba(0,212,255,0.35) 0%, rgba(138,43,226,0.15) 45%, transparent 70%)',
                  filter: 'blur(6px)',
                  animation: `${pulseGlow} 3s ease-in-out infinite`,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: '4% 6%',
                  borderRadius: '50%',
                  border: '1px dashed rgba(0, 212, 255, 0.25)',
                  animation: `${orbit} 18s linear infinite`,
                }}
              />
              <SpinningHeroImage src={src} alt={selected?.name || ''} />
            </Box>
          ) : (
            <Typography color="text.secondary" variant="body2" sx={{ px: 2, textAlign: 'center' }}>
              Загрузка модели…
            </Typography>
          )}
        </Box>

        <Typography
          variant="caption"
          sx={{
            flexShrink: 0,
            color: 'text.secondary',
            textAlign: 'center',
            letterSpacing: '0.08em',
            width: '100%',
            mb: 1,
            pointerEvents: 'none',
          }}
        >
          {caption}
          {models.length > 0 ? ` · ${models.length} шт.` : ''}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', pointerEvents: 'auto' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FaceRetouchingNaturalIcon />}
            onClick={() => setPickerOpen(true)}
            sx={{
              borderColor: 'primary.main',
              color: 'primary.light',
            }}
          >
            Выбрать модель
          </Button>
          <Button
            size="small"
            variant="text"
            startIcon={<RefreshIcon />}
            onClick={() => reloadModels()}
            sx={{ color: 'text.secondary' }}
          >
            Обновить
          </Button>
        </Box>
      </Box>

      <ChooseHeroModelDialog
        open={pickerOpen}
        models={models}
        selectedId={selected?.id ?? ''}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        folderHint={MODELS_FOLDER_HINT}
      />
    </>
  );
};

export default LunoxSpinFigure;
