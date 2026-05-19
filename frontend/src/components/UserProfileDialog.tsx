import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Typography,
  Box,
  Paper,
  CircularProgress,
} from '@mui/material';
import { PublicProfile } from '../api/clientApi';
import { mediaUrl } from '../utils/media';

interface Props {
  open: boolean;
  profile: PublicProfile | null;
  loading: boolean;
  onClose: () => void;
}

const UserProfileDialog: React.FC<Props> = ({ open, profile, loading, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Профиль игрока</DialogTitle>
    <DialogContent dividers>
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : profile ? (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar src={mediaUrl(profile.avatar_url)} sx={{ width: 96, height: 96, mb: 1 }}>
              {profile.username?.[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="h6">{profile.username}</Typography>
          </Box>
          {profile.game_cards?.length ? (
            profile.game_cards.map((card, i) => (
              <Paper key={card.id || i} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {card.game}
                </Typography>
                {card.rank && (
                  <Typography variant="body2" color="text.secondary">
                    Ранг: {card.rank}
                  </Typography>
                )}
                {card.comment && (
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {card.comment}
                  </Typography>
                )}
              </Paper>
            ))
          ) : (
            <Typography color="text.secondary">Карточки игр не заполнены</Typography>
          )}
        </>
      ) : (
        <Typography color="error">Не удалось загрузить профиль</Typography>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Закрыть</Button>
    </DialogActions>
  </Dialog>
);

export default UserProfileDialog;
