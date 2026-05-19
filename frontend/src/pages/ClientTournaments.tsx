import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import NavBar from '../components/NavBar';
import RegisterTournamentDialog from '../components/RegisterTournamentDialog';
import DiamondIcon from '@mui/icons-material/Diamond';

const API = 'http://localhost:8080';
const NEWS_PLACEHOLDER =
  'linear-gradient(135deg, rgba(0,212,255,0.25) 0%, rgba(255,0,68,0.2) 100%)';

interface NewsItem {
  title: string;
  url: string;
  image: string;
  date?: string;
}

interface Tournament {
  id: number;
  title: string;
  game: string;
  max_teams: number;
  number_rounds: number;
  winner_team: string;
  info_tournament: string;
  description: string;
  status: string;
  start_date: string;
  registration_deadline: string;
  entry_fee: number;
  prize_pool: number;
  banner_url: string;
  is_vip?: boolean;
}

const formatMoney = (n: number) =>
  (n ?? 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';

const formatDate = (iso: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

const statusLabel: Record<string, string> = {
  approved: 'Открыт',
  ongoing: 'Идёт',
  pending: 'Скоро',
};

const ClientTournaments: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOrganizer = user?.role === 'organizer';
  const isManager = user?.role === 'manager';
  const isClientUser = user?.role === 'user';
  const showNews = !user || isClientUser;
  const staffHome = isOrganizer || isManager;
  const tournamentsRef = useRef<HTMLDivElement>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const tRes = await fetch(`${API}/api/client/tournaments`);
        if (!tRes.ok) {
          const detail = await tRes.text();
          throw new Error(detail || `HTTP ${tRes.status}`);
        }
        const tData = await tRes.json();
        if (!cancelled) {
          setTournaments(Array.isArray(tData) ? tData : []);
          setTournamentsLoading(false);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (!cancelled) {
          if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            setError('Сервер недоступен. Запустите backend: go run ./cmd/server');
          } else {
            setError('Ошибка загрузки турниров' + (msg ? `: ${msg}` : ''));
          }
          setTournamentsLoading(false);
        }
      }
    })();

    if (showNews) {
      (async () => {
        setNewsLoading(true);
        try {
          const nRes = await fetch(`${API}/api/client/news`);
          if (nRes.ok) {
            const nData = await nRes.json();
            if (!cancelled) {
              setNews(Array.isArray(nData) ? nData.slice(0, 3) : []);
            }
          }
        } catch {
          /* новости не блокируют страницу */
        } finally {
          if (!cancelled) setNewsLoading(false);
        }
      })();
    } else if (!cancelled) {
      setNewsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [showNews]);

  useEffect(() => {
    const state = location.state as { scrollToTournaments?: boolean } | null;
    const shouldScroll =
      state?.scrollToTournaments || window.location.hash === '#tournaments';
    if (!shouldScroll) return;

    const timer = window.setTimeout(() => {
      tournamentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [tournamentsLoading, location]);

  const openRegister = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRegisterOpen(true);
  };

  const canRegister = isClientUser;
  const displayTournaments = staffHome ? tournaments : tournaments.slice(0, 5);

  return (
    <>
      <NavBar />

      <Container maxWidth="lg" sx={{ pb: 6 }}>
        {showNews && (
        <Box sx={{ mt: 3, mb: 4 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', letterSpacing: '0.2em', fontWeight: 700 }}
          >
            Cybersport.ru
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              mb: 2,
              background: 'linear-gradient(135deg, #00d4ff 0%, #ff0044 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Главные новости
          </Typography>

          {newsLoading && (
            <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
              Загружаем интересные статьи
            </Alert>
          )}

          <Grid container spacing={2}>
            {!newsLoading &&
              news.map((item, i) => (
              <Grid key={item.url + i} size={{ xs: 12, md: 4 }}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 32px rgba(0, 212, 255, 0.15)',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <Box
                    sx={{
                      height: 180,
                      overflow: 'hidden',
                      bgcolor: 'rgba(0, 212, 255, 0.08)',
                      background: item.image ? undefined : NEWS_PLACEHOLDER,
                    }}
                  >
                    {item.image && (
                      <Box
                        component="img"
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        sx={{
                          width: '100%',
                          height: 180,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          if (el.parentElement) {
                            el.parentElement.style.background = NEWS_PLACEHOLDER;
                          }
                        }}
                      />
                    )}
                  </Box>
                  <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                    {item.date && (
                      <Chip label={item.date} size="small" sx={{ mb: 1 }} variant="outlined" />
                    )}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                      {item.title}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      endIcon={<OpenInNewIcon />}
                      component="a"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Читать
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {!newsLoading && news.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Typography color="text.secondary">Новости временно недоступны</Typography>
              </Grid>
            )}
          </Grid>
        </Box>
        )}

        {showNews && (
          <Divider sx={{ mb: 4, borderColor: 'rgba(0, 212, 255, 0.2)' }} />
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(255, 0, 68, 0.1)', border: '1px solid #ff0044' }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} ref={tournamentsRef} id="tournaments-section" sx={{ mt: staffHome ? 3 : 0 }}>
          {!staffHome && <Grid size={{ xs: 0, md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }} />}
          <Grid size={{ xs: 12, md: staffHome ? 12 : 8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <EmojiEventsIcon color="primary" />
                Турниры
              </Typography>
              {isClientUser && (
                <Button variant="outlined" onClick={() => navigate('/client/all-tournaments')}>
                  Открыть все
                </Button>
              )}
            </Box>

            {tournamentsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : tournaments.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  Нет доступных турниров
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Зайдите позже — турниры скоро появятся
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {displayTournaments.map((tournament) => (
                  <Card
                    key={tournament.id}
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <CardMedia
                      component="img"
                      sx={{
                        width: { xs: '100%', sm: 200 },
                        height: { xs: 160, sm: 'auto' },
                        minHeight: { sm: 140 },
                        objectFit: 'cover',
                        flexShrink: 0,
                        bgcolor: 'rgba(0, 212, 255, 0.06)',
                      }}
                      image={bannerSrc(tournament.banner_url)}
                      alt={tournament.title}
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.src = '';
                        el.style.background =
                          'linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(255,0,68,0.15) 100%)';
                      }}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {tournament.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        {tournament.is_vip ? (
                          <Chip icon={<DiamondIcon />} label="VIP" color="secondary" size="small" />
                        ) : (
                          <Chip label="Обычный" size="small" variant="outlined" />
                        )}
                        <Chip label={tournament.game} size="small" />
                      </Box>
                      <Typography variant="body1" sx={{ color: 'primary.light', fontWeight: 600, mb: 1 }}>
                        Призовой фонд: {formatMoney(tournament.prize_pool)}
                      </Typography>
                      {tournament.entry_fee > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          Взнос: {formatMoney(tournament.entry_fee)}
                        </Typography>
                      )}
                      <Box sx={{ mt: 'auto', pt: 2 }}>
                        <Button variant="contained" onClick={() => setSelected(tournament)}>
                          Подробнее
                        </Button>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>{selected.title}</DialogTitle>
            <DialogContent dividers>
              {selected.banner_url && (
                <Box
                  component="img"
                  src={bannerSrc(selected.banner_url)}
                  alt=""
                  sx={{ width: '100%', borderRadius: 1, mb: 2, maxHeight: 220, objectFit: 'cover' }}
                />
              )}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Игра:</strong> {selected.game}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Статус:</strong> {statusLabel[selected.status] || selected.status}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Старт:</strong> {formatDate(selected.start_date)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Регистрация до:</strong> {formatDate(selected.registration_deadline)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Макс. команд:</strong> {selected.max_teams}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Раундов:</strong> {selected.number_rounds}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Призовой фонд:</strong> {formatMoney(selected.prize_pool)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Взнос:</strong>{' '}
                {selected.entry_fee > 0 ? formatMoney(selected.entry_fee) : 'Бесплатно'}
              </Typography>
              {(selected.description || selected.info_tournament) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Описание
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selected.description || selected.info_tournament}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
              {canRegister ? (
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={openRegister}
                  sx={{
                    background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                  }}
                >
                  Зарегистрироваться
                </Button>
              ) : user?.role === 'organizer' ? (
                <Chip label="Доступно организаторам" color="primary" sx={{ alignSelf: 'center' }} />
              ) : user?.role === 'manager' ? (
                <Chip label="Менеджер" color="secondary" sx={{ alignSelf: 'center' }} />
              ) : (
                <Button variant="contained" fullWidth onClick={() => navigate('/login')}>
                  Войти для регистрации
                </Button>
              )}
              <Button onClick={() => setSelected(null)}>Закрыть</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <RegisterTournamentDialog
        open={registerOpen}
        tournamentId={selected?.id ?? null}
        isVip={!!selected?.is_vip}
        onClose={() => setRegisterOpen(false)}
        onSuccess={() => {
          setSelected(null);
          alert('Заявка отправлена! Ожидайте подтверждения организатора.');
        }}
      />
    </>
  );
};

export default ClientTournaments;
