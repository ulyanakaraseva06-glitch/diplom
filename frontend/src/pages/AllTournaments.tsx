import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DiamondIcon from '@mui/icons-material/Diamond';
import NavBar from '../components/NavBar';
import RegisterTournamentDialog from '../components/RegisterTournamentDialog';
import { useAuth } from '../contexts/AuthContext';
import {
  clientApi,
  ClientTournament,
  MyRegistration,
  TournamentOrganizer,
} from '../api/clientApi';
import { confirmDelete } from '../utils/confirmDelete';

const API = 'http://localhost:8080';

const formatMoney = (n: number) =>
  (n ?? 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';

const formatDate = (iso: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const bannerSrc = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API}${url}`;
};

const AllTournaments: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<ClientTournament[]>([]);
  const [organizers, setOrganizers] = useState<TournamentOrganizer[]>([]);
  const [myRegs, setMyRegs] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organizerId, setOrganizerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vipFilter, setVipFilter] = useState('');
  const [selected, setSelected] = useState<ClientTournament | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerTarget, setRegisterTarget] = useState<ClientTournament | null>(null);

  const buildParams = useCallback(() => {
    const p: Record<string, string> = {};
    if (organizerId) p.organizer_id = organizerId;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    if (vipFilter !== '') p.is_vip = vipFilter;
    return p;
  }, [organizerId, dateFrom, dateTo, vipFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, orgs] = await Promise.all([
        clientApi.getClientTournaments(buildParams()),
        clientApi.getTournamentOrganizers(),
      ]);
      setTournaments(list);
      setOrganizers(orgs);
      if (isAuthenticated) {
        const regs = await clientApi.getMyRegistrations();
        setMyRegs(regs);
      }
    } catch (e) {
      setError('Не удалось загрузить турниры');
    } finally {
      setLoading(false);
    }
  }, [buildParams, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const myRegFor = (tournamentId: number) =>
    myRegs.find((r) => r.tournament_id === tournamentId && r.status === 'pending');

  const openRegister = (t: ClientTournament) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRegisterTarget(t);
    setRegisterOpen(true);
  };

  const cancelReg = async (regId: number) => {
    if (!confirmDelete()) return;
    try {
      await clientApi.cancelRegistration(regId);
      load();
    } catch {
      alert('Не удалось отменить заявку');
    }
  };

  const canRegister = user?.role === 'user';

  return (
    <>
      <NavBar />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon color="primary" />
          Турниры
        </Typography>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Фильтры
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Организатор</InputLabel>
              <Select
                value={organizerId}
                label="Организатор"
                onChange={(e) => setOrganizerId(e.target.value)}
              >
                <MenuItem value="">Все</MenuItem>
                {organizers.map((o) => (
                  <MenuItem key={o.id} value={String(o.id)}>
                    {o.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="Дата от"
              InputLabelProps={{ shrink: true }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <TextField
              size="small"
              type="date"
              label="Дата до"
              InputLabelProps={{ shrink: true }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Статус</InputLabel>
              <Select value={vipFilter} label="Статус" onChange={(e) => setVipFilter(e.target.value)}>
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="false">Обычный</MenuItem>
                <MenuItem value="true">VIP</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={load}>
              Применить
            </Button>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : tournaments.length === 0 ? (
          <Alert severity="info">Турниры не найдены</Alert>
        ) : (
          <Grid container spacing={2}>
            {tournaments.map((t) => {
              const pending = myRegFor(t.id);
              return (
                <Grid key={t.id} size={{ xs: 12, md: 6 }}>
                  <Card sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, height: '100%' }}>
                    {t.banner_url && (
                      <CardMedia
                        component="img"
                        sx={{ width: { sm: 200 }, height: { xs: 160, sm: 'auto' } }}
                        image={bannerSrc(t.banner_url)}
                        alt={t.title}
                      />
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <CardContent sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                          {t.is_vip ? (
                            <Chip icon={<DiamondIcon />} label="VIP" color="secondary" size="small" />
                          ) : (
                            <Chip label="Обычный" size="small" variant="outlined" />
                          )}
                          <Chip label={t.game} size="small" />
                        </Box>
                        <Typography variant="h6">{t.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Организатор: {t.organizer_username || '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Старт: {formatDate(t.start_date)}
                        </Typography>
                        <Typography variant="body2">
                          Призовой фонд: {formatMoney(t.prize_pool)}
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Button size="small" onClick={() => setSelected(t)}>
                          Подробнее
                        </Button>
                        {canRegister && !pending && (
                          <Button size="small" variant="contained" onClick={() => openRegister(t)}>
                            Зарегистрироваться
                          </Button>
                        )}
                        {pending && (
                          <>
                            <Chip label="Заявка отправлена" color="warning" size="small" />
                            <Button
                              size="small"
                              color="error"
                              onClick={() => cancelReg(pending.id)}
                            >
                              Отменить заявку
                            </Button>
                          </>
                        )}
                      </CardActions>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        <RegisterTournamentDialog
          open={registerOpen}
          tournamentId={registerTarget?.id ?? null}
          isVip={!!registerTarget?.is_vip}
          onClose={() => setRegisterOpen(false)}
          onSuccess={load}
        />

        <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
          {selected && (
            <>
              <DialogTitle>{selected.title}</DialogTitle>
              <DialogContent dividers>
                <Typography paragraph>{selected.description}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2">Взнос: {formatMoney(selected.entry_fee)}</Typography>
                <Typography variant="body2">
                  Регистрация до: {formatDate(selected.registration_deadline)}
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelected(null)}>Закрыть</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </>
  );
};

export default AllTournaments;
