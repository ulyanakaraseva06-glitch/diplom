import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardActionArea,
  CardMedia,
  Typography,
  Box,
  Chip,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { HeroModel, heroDisplayName, heroModelImageUrl } from '../config/heroModels';

type Props = {
  open: boolean;
  models: HeroModel[];
  selectedId: string;
  folderHint: string;
  onClose: () => void;
  onSelect: (model: HeroModel) => void;
};

const ChooseHeroModelDialog: React.FC<Props> = ({
  open,
  models,
  selectedId,
  folderHint,
  onClose,
  onSelect,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Выберите героя</DialogTitle>
      <DialogContent dividers>
        {models.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Картинки не найдены. Положите файлы <strong>.png</strong> или <strong>.jpg</strong> сюда:
            </Typography>
            <Typography variant="body2" component="code" sx={{ display: 'block', mb: 1 }}>
              {folderHint}
            </Typography>
            <Typography variant="body2">
              Затем в терминале: <code>npm run sync-models</code> и перезапустите{' '}
              <code>npm start</code>, либо нажмите «Обновить» на главной.
            </Typography>
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {models.map((model) => {
              const active = model.id === selectedId;
              return (
                <Grid key={model.id} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: active ? 'primary.main' : 'divider',
                      borderWidth: active ? 2 : 1,
                      position: 'relative',
                    }}
                  >
                    {active && (
                      <CheckCircleIcon
                        color="primary"
                        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                      />
                    )}
                    <CardActionArea
                      onClick={() => {
                        onSelect(model);
                        onClose();
                      }}
                    >
                      <CardMedia
                        component="img"
                        image={heroModelImageUrl(model)}
                        alt={heroDisplayName(model)}
                        sx={{
                          height: 160,
                          objectFit: 'contain',
                          bgcolor: 'rgba(0, 212, 255, 0.06)',
                          p: 1,
                        }}
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.opacity = '0.3';
                        }}
                      />
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {heroDisplayName(model)}
                        </Typography>
                        {active && (
                          <Chip label="Выбрано" size="small" color="primary" sx={{ mt: 1 }} />
                        )}
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChooseHeroModelDialog;
