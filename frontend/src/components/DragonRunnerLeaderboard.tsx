import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Popover,
  Typography,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { clientApi, DragonRunnerLeaderboardEntry } from '../api/clientApi';

const RATING_HINT = (
  <>
    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
      Топ-1 получит бесплатную подписку на месяц
    </Typography>
    <Typography variant="caption" color="text.secondary">
      Итоги подводятся каждое 30 число!
    </Typography>
  </>
);

const MEDAL_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'] as const;

interface Props {
  refreshKey?: number;
}

const DragonRunnerLeaderboard: React.FC<Props> = ({ refreshKey = 0 }) => {
  const [entries, setEntries] = useState<DragonRunnerLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hintAnchor, setHintAnchor] = useState<HTMLElement | null>(null);
  const hintOpen = Boolean(hintAnchor);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientApi.getDragonRunnerLeaderboard();
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
        <EmojiEventsIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Рейтинг
        </Typography>
        <IconButton
          size="small"
          aria-label="Подсказка о рейтинге"
          onClick={(e) => {
            setHintAnchor(hintOpen ? null : e.currentTarget);
          }}
          sx={{
            ml: 0.25,
            width: 18,
            height: 18,
            minWidth: 18,
            p: 0,
            borderRadius: '50%',
            border: '1px solid',
            borderColor: 'text.secondary',
            color: 'text.secondary',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
              bgcolor: 'rgba(0, 212, 255, 0.08)',
            },
          }}
        >
          ?
        </IconButton>
        <Popover
          open={hintOpen}
          anchorEl={hintAnchor}
          onClose={() => setHintAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                p: 1.5,
                maxWidth: 260,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
              },
            },
          }}
        >
          {RATING_HINT}
        </Popover>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        Лучшие результаты
      </Typography>

      {loading ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Пока никто не установил рекорд. Сыграйте первым!
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {entries.map((e) => (
            <Box
              key={e.user_id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                p: 1,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  minWidth: 22,
                  color: MEDAL_COLORS[e.rank - 1] ?? 'text.secondary',
                }}
              >
                {e.rank}
              </Typography>
              <Avatar
                src={e.avatar_url || undefined}
                sx={{ width: 32, height: 32, bgcolor: 'primary.dark', fontSize: 14 }}
              >
                {(e.username || '?')[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {e.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {e.score} очк.
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default DragonRunnerLeaderboard;
