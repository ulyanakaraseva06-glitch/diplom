import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
  IconButton,
  Tooltip,
  Snackbar,
  Avatar,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import NavBar from '../components/NavBar';
import { clientApi, GameCard } from '../api/clientApi';

const API = 'http://localhost:8080/api';
const emptyCard = (): GameCard => ({ id: '', game: '', rank: '', comment: '' });

const avatarSrc = (url: string) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `http://localhost:8080${url}`;
};

const Profile: React.FC = () => {
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [cards, setCards] = useState<GameCard[]>([emptyCard()]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mongoWarning, setMongoWarning] = useState('');
  const [snack, setSnack] = useState('');

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Войдите в аккаунт, чтобы открыть профиль');
        setLoading(false);
        return;
      }

      let loadedAny = false;
      let loadedEmail = '';

      try {
        const meRes = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          loadedEmail = me.email ?? '';
          setEmail(loadedEmail);
          setUsername(me.username ?? '');
          loadedAny = true;
        } else {
          setError('Не удалось загрузить данные аккаунта');
        }
      } catch {
        setError('Не удалось загрузить данные аккаунта');
      }

      try {
        const profile = await clientApi.getProfile();
        const gc = profile.game_cards;
        setCards(Array.isArray(gc) && gc.length ? gc : [emptyCard()]);
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
          updateUser({ avatar_url: profile.avatar_url });
        }
        if (profile.email && !loadedEmail) setEmail(profile.email);
        loadedAny = true;
        if (profile.mongo_ready === false) {
          setMongoWarning(
            'Сохранение игр и фото недоступно: запустите MongoDB и перезапустите сервер'
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('MongoDB unavailable') || msg.includes('503')) {
          setMongoWarning('MongoDB не запущена — игры и фото не сохранятся');
        } else if (!loadedAny) {
          setError('Не удалось загрузить профиль. Проверьте, что backend запущен');
        } else {
          setMongoWarning('Не удалось загрузить игры и фото из MongoDB');
        }
      }

      try {
        const sub = await clientApi.getMySubscription();
        setHasSubscription(!!sub && sub.is_active);
      } catch {
        /* подписка необязательна для отображения профиля */
      }

      if (loadedAny) setError('');
      setLoading(false);
    })();
  }, []);

  const saveUsername = async () => {
    if (!hasSubscription) {
      setSnack('Для смены никнейма нужна активная подписка');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/auth/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      updateUser({ username: data.username });
      setSnack('Никнейм обновлён');
    } catch {
      setSnack('Не удалось сохранить никнейм');
    } finally {
      setSaving(false);
    }
  };

  const saveCards = async () => {
    const valid = cards.filter((c) => c.game.trim());
    if (valid.length === 0) {
      setSnack('Заполните хотя бы одну карточку с указанием игры');
      return;
    }
    for (const c of valid) {
      if (c.comment.length > 500) {
        setSnack('Комментарий не более 500 символов');
        return;
      }
    }
    setSaving(true);
    try {
      const data = await clientApi.updateGameCards(valid);
      setCards(data.game_cards);
      setSnack('Карточки сохранены');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setSnack(msg.includes('MongoDB') ? 'MongoDB недоступна — запустите базу и сервер' : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const updateCard = (index: number, field: keyof GameCard, value: string) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const removeCard = async (index: number) => {
    const next = cards.filter((_, i) => i !== index);
    const valid = next.length ? next : [emptyCard()];
    setCards(valid);
    if (cards[index].id && cards[index].game.trim()) {
      try {
        await clientApi.updateGameCards(valid.filter((c) => c.game.trim()));
        setSnack('Карточка удалена');
      } catch {
        setSnack('Ошибка удаления');
      }
    }
  };

  const addCard = () => setCards((prev) => [...prev, emptyCard()]);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await clientApi.uploadImage(file);
      await clientApi.updateAvatar(url);
      setAvatarUrl(url);
      updateUser({ avatar_url: url });
      setSnack('Фото профиля обновлено');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setSnack(msg.includes('MongoDB') ? 'MongoDB недоступна' : 'Ошибка загрузки фото');
    }
    e.target.value = '';
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <Box display="flex" justifyContent="center" sx={{ mt: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
              Мой профиль
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {mongoWarning && <Alert severity="warning" sx={{ mb: 2 }}>{mongoWarning}</Alert>}

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Avatar
                src={avatarSrc(avatarUrl)}
                sx={{ width: 120, height: 120, mb: 2, fontSize: '2.5rem' }}
              >
                {username?.[0]?.toUpperCase() || '?'}
              </Avatar>
              <input type="file" accept="image/*" hidden id="avatar-upload" onChange={uploadAvatar} />
              <label htmlFor="avatar-upload">
                <Button component="span" variant="contained" startIcon={<PhotoCameraIcon />}>
                  Загрузить фото с устройства
                </Button>
              </label>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                JPG, PNG — до 5 МБ
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Tooltip title="Почта из PostgreSQL, изменить нельзя">
                  <TextField fullWidth label="Почта" value={email} disabled />
                </Tooltip>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Tooltip
                    title={
                      hasSubscription
                        ? 'С активной подпиской можно менять никнейм'
                        : 'Никнейм можно изменить только с подпиской'
                    }
                  >
                    <TextField
                      fullWidth
                      label="Никнейм"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={!hasSubscription}
                      helperText={!hasSubscription ? 'Оформите подписку для смены никнейма' : ''}
                    />
                  </Tooltip>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveUsername}
                    disabled={saving || !hasSubscription}
                  >
                    Сохранить
                  </Button>
                </Box>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  Дополнительная информация
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Данные сохраняются в MongoDB. Игра обязательна, ранг и комментарий — по желанию.
                </Typography>

                {cards.map((card, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <Tooltip title="Название игры (обязательно)">
                          <TextField
                            fullWidth
                            required
                            label="Игра"
                            value={card.game}
                            onChange={(e) => updateCard(index, 'game', e.target.value)}
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Tooltip title="Ваш ранг в этой игре">
                          <TextField
                            fullWidth
                            label="Ранг"
                            value={card.rank}
                            onChange={(e) => updateCard(index, 'rank', e.target.value)}
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Tooltip title="До 500 символов">
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Комментарий"
                            value={card.comment}
                            onChange={(e) => updateCard(index, 'comment', e.target.value)}
                            inputProps={{ maxLength: 500 }}
                            helperText={`${card.comment.length}/500`}
                          />
                        </Tooltip>
                      </Grid>
                      <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={saveCards} disabled={saving}>
                          Сохранить
                        </Button>
                        <Tooltip title="Удалить карточку из профиля">
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => removeCard(index)}
                          >
                            Удалить
                          </Button>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                <Tooltip title="Добавить ещё одну игру">
                  <IconButton color="primary" onClick={addCard} sx={{ border: '1px dashed', borderRadius: 2, p: 2 }}>
                    <AddIcon fontSize="large" />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Container>
      <Snackbar open={!!snack} autoHideDuration={4000} message={snack} onClose={() => setSnack('')} />
    </>
  );
};

export default Profile;
