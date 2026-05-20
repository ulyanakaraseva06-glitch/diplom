import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DiamondIcon from '@mui/icons-material/Diamond';
import NavBar from '../components/NavBar';
import RegisterTournamentDialog from '../components/RegisterTournamentDialog';
import TournamentRegistrationActions from '../components/TournamentRegistrationActions';
import { useAuth } from '../contexts/AuthContext';
import {
  clientApi,
  ClientTournament,
  MyRegistration,
  TournamentOrganizer,
} from '../api/clientApi';
import { filterTournamentsByTab, myRegForTournament, TournamentTab } from '../utils/tournamentHelpers';

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
  const isOrganizer = user?.role === 'organizer';
  const showMyApplicationsTab = isAuthenticated && !isOrganizer;
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<ClientTournament[]>([]);
  const [organizers, setOrganizers] = useState<TournamentOrganizer[]>([]);
  const [myRegs, setMyRegs] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TournamentTab>('all');
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

  const loadRegs = useCallback(async () => {
    if (!isAuthenticated || isOrganizer) {
      setMyRegs([]);
      return;
    }
    try {
      const regs = await clientApi.getMyRegistrations();
      setMyRegs(regs);
    } catch {
      setMyRegs([]);
    }
  }, [isAuthenticated, isOrganizer]);

  useEffect(() => {
    if (isOrganizer && tab === 'my') {
      setTab('all');
    }
  }, [isOrganizer, tab]);

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
      await loadRegs();
    } catch {
      setError('Не удалось загрузить турниры');
    } finally {
      setLoading(false);
    }
  }, [buildParams, loadRegs]);

  useEffect(() => {
    load();
  }, [load]);

  const displayed = useMemo(
    () => filterTournamentsByTab(tournaments, tab, myRegs),
    [tournaments, tab, myRegs]
  );

  const openRegister = (t: ClientTournament) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRegisterTarget(t);
    setRegisterOpen(true);
  };

  const cancelReg = async (regId: number) => {
    try {
      await clientApi.cancelRegistration(regId);
      await loadRegs();
    } catch {
      alert('Не удалось отменить заявку');
    }
  };

  const canRegister = user?.role === 'user';
  const selectedReg = selected ? myRegForTournament(myRegs, selected.id) : undefined;

  return (
    <>
      <NavBar />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon color="primary" />
          Турниры
        </Typography>

        <Paper sx={{ p: 2, mb: 2 }}>
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
              <InputLabel>Тип</InputLabel>
              <Select value={vipFilter} label="Тип" onChange={(e) => setVipFilter(e.target.value)}>
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

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Все турниры" value="all" />
          <Tab label="Прошедшие" value="past" />
          {showMyApplicationsTab && <Tab label="Мои заявки" value="my" />}
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : displayed.length === 0 ? (
          <Alert severity="info">
            {tab === 'my'
              ? 'Нет турниров с вашими заявками по выбранным фильтрам'
              : tab === 'past'
                ? 'Прошедших турниров не найдено'
                : 'Турниры не найдены'}
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {displayed.map((t) => (
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
                      <TournamentRegistrationActions
                        tournamentId={t.id}
                        myRegs={myRegs}
                        canRegister={!!canRegister}
                        onRegister={() => openRegister(t)}
                        onCancelReg={cancelReg}
                      />
                    </CardActions>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <RegisterTournamentDialog
          open={registerOpen}
          tournamentId={registerTarget?.id ?? null}
          isVip={!!registerTarget?.is_vip}
          onClose={() => setRegisterOpen(false)}
          onSuccess={async () => {
            setRegisterOpen(false);
            await loadRegs();
          }}
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
              <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, px: 3, pb: 2 }}>
                {selectedReg ? (
                  <TournamentRegistrationActions
                    tournamentId={selected.id}
                    myRegs={myRegs}
                    canRegister={false}
                    onRegister={() => {}}
                    onCancelReg={async (id) => {
                      await cancelReg(id);
                      setSelected(null);
                    }}
                    size="medium"
                    showRegisterButton={false}
                  />
                ) : canRegister ? (
                  <Button variant="contained" fullWidth onClick={() => openRegister(selected)}>
                    Зарегистрироваться
                  </Button>
                ) : null}
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
