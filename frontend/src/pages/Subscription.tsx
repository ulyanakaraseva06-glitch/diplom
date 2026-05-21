import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavBar from '../components/NavBar';
import StarIcon from '@mui/icons-material/Star';
import PeopleIcon from '@mui/icons-material/People';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DiamondIcon from '@mui/icons-material/Diamond';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useAuth } from '../contexts/AuthContext';
import { clientApi, Team, UserSubscription } from '../api/clientApi';

interface Subscription {
  id: string;
  name: string;
  price: number;
  benefits: string[];
  target_type: string;
}

type PayTarget = { sub: Subscription };

type SubKind = 'personal' | 'team';

function getSubKind(sub: UserSubscription): SubKind {
  if (
    sub.source === 'team' ||
    sub.team_id ||
    sub.target_type === 'team' ||
    sub.subscription_id === 'sub_team'
  ) {
    return 'team';
  }
  return 'personal';
}

function canCancelSubscription(userSub: UserSubscription, leaderTeams: Team[]): boolean {
  if (userSub.can_cancel) return true;
  if (getSubKind(userSub) !== 'team') return false;
  if (!userSub.team_id) {
    return leaderTeams.length > 0;
  }
  return leaderTeams.some((t) => t.id === userSub.team_id);
}

function sortActiveSubs(subs: UserSubscription[]): UserSubscription[] {
  return [...subs].sort((a, b) => {
    const order = (k: SubKind) => (k === 'personal' ? 0 : 1);
    return order(getSubKind(a)) - order(getSubKind(b));
  });
}

const SubscriptionPage: React.FC = () => {
  const { theme } = useThemeContext();
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [activeSubs, setActiveSubs] = useState<UserSubscription[]>([]);
  const [hasPersonal, setHasPersonal] = useState(false);
  const [hasTeam, setHasTeam] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [leaderTeams, setLeaderTeams] = useState<Team[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<PayTarget | null>(null);
  const [confirmTeamId, setConfirmTeamId] = useState('');
  const [cancelTarget, setCancelTarget] = useState<UserSubscription | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSubscriptions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSubscriptions(data);
    } catch {
      setError('Ошибка загрузки подписок');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserSubscription = useCallback(async () => {
    try {
      const data = await clientApi.getMySubscriptions();
      setActiveSubs(sortActiveSubs(data.subscriptions));
      setHasPersonal(data.has_personal);
      setHasTeam(data.has_team);
      if (data.has_active) {
        updateUser({ has_subscription: true });
      } else {
        updateUser({ has_subscription: false });
      }
    } catch {
      console.error('Ошибка загрузки подписки пользователя');
    }
  }, [updateUser]);

  useEffect(() => {
    fetchSubscriptions();
    fetchUserSubscription();
    clientApi.getWallet().then((w) => setWalletBalance(w.balance)).catch(() => {});
    clientApi.getTeams().then((teams) => {
      setLeaderTeams(teams.filter((t) => t.is_leader));
    }).catch(() => {});
  }, [fetchSubscriptions, fetchUserSubscription]);

  const hasActiveSub = activeSubs.length > 0;

  const isPlanAlreadyActive = (targetType: string) => {
    if (targetType === 'team') return hasTeam;
    if (targetType === 'user') return hasPersonal;
    return activeSubs.some((s) => s.target_type === targetType);
  };

  const openPayConfirm = (sub: Subscription) => {
    if (sub.target_type === 'team') {
      if (leaderTeams.length === 0) {
        setError('Командную подписку может оформить только лидер команды. Создайте команду в разделе «Друзья».');
        return;
      }
      setConfirmTeamId(leaderTeams[0].id);
    }
    setConfirmTarget({ sub });
    setError('');
  };

  const selectedConfirmTeam = leaderTeams.find((t) => t.id === confirmTeamId);

  const handleConfirmPay = async () => {
    if (!confirmTarget) return;
    const { sub } = confirmTarget;

    if (sub.target_type === 'team' && !confirmTeamId) {
      setError('Выберите команду');
      return;
    }

    const teamId = sub.target_type === 'team' ? confirmTeamId : undefined;
    setConfirmTarget(null);

    if (walletBalance < sub.price) {
      setError(`Недостаточно средств. Баланс: ${walletBalance.toFixed(0)} ₽, нужно: ${sub.price} ₽`);
      return;
    }

    setSubscribing(sub.id);
    try {
      const data = await clientApi.paySubscription(sub.id, teamId);
      setWalletBalance(data.balance);
      setSuccessMsg(data.message || 'Оплата подтверждена. Подписка активирована.');
      if (data.subscriptions && data.subscriptions.length > 0) {
        setActiveSubs(sortActiveSubs(data.subscriptions));
        setHasPersonal(!!data.has_personal);
        setHasTeam(!!data.has_team);
        if (data.has_active) {
          updateUser({ has_subscription: true });
        }
      } else {
        await fetchUserSubscription();
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : '';
      setError(raw || 'Ошибка оплаты. Пополните кошелёк в меню «Мой кошелёк»');
    } finally {
      setSubscribing(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_subscription_id: cancelTarget.id }),
      });

      if (response.ok) {
        let msg = 'Подписка отменена';
        try {
          const data = await response.json();
          if (data?.message) msg = data.message;
        } catch {
          /* ignore */
        }
        setCancelTarget(null);
        setSuccessMsg(msg);
        await fetchUserSubscription();
      } else {
        const text = await response.text();
        setError(text || 'Ошибка отмены подписки');
      }
    } catch {
      setError('Ошибка отмены подписки');
    } finally {
      setCancelling(false);
    }
  };

  const getCardGradient = (targetType: string) => {
    switch (targetType) {
      case 'user':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'team':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'organizer':
        return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
      default:
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  const getCardIcon = (targetType: string) => {
    switch (targetType) {
      case 'user':
        return <StarIcon sx={{ fontSize: 60, color: '#fff', opacity: 0.3 }} />;
      case 'team':
        return <PeopleIcon sx={{ fontSize: 60, color: '#fff', opacity: 0.3 }} />;
      case 'organizer':
        return <DiamondIcon sx={{ fontSize: 60, color: '#fff', opacity: 0.3 }} />;
      default:
        return <WhatshotIcon sx={{ fontSize: 60, color: '#fff', opacity: 0.3 }} />;
    }
  };

  const getTargetTypeLabel = (targetType: string) => {
    switch (targetType) {
      case 'user':
        return 'Для игрока';
      case 'team':
        return 'Для команды';
      case 'organizer':
        return 'Для организатора';
      default:
        return targetType;
    }
  };

  const isTeamPayDisabled = (sub: Subscription) =>
    sub.target_type === 'team' && leaderTeams.length === 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <NavBar />

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/client/tournaments')} sx={{ mb: 2 }}>
            Назад к турнирам
          </Button>

          <Typography variant="h4" gutterBottom align="center" sx={{ mb: 1, fontWeight: 700 }}>
            Выберите подписку
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Получите доступ к расширенным возможностям платформы
          </Typography>

          {hasActiveSub && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {activeSubs.length === 1
                  ? 'Ваша активная подписка'
                  : `Ваши активные подписки (${activeSubs.length})`}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {activeSubs.map((userSub) => {
                  const kind = getSubKind(userSub);
                  const isTeam = kind === 'team';
                  return (
                    <Alert
                      key={userSub.id}
                      severity="success"
                      icon={isTeam ? <PeopleIcon fontSize="inherit" /> : <StarIcon fontSize="inherit" />}
                      sx={{
                        alignItems: 'flex-start',
                        border: theme === 'cyber' ? '1px solid #00ff88' : undefined,
                        '& .MuiAlert-message': { width: '100%' },
                      }}
                    >
                      <AlertTitle sx={{ fontWeight: 700 }}>
                        {isTeam ? 'Командная подписка' : 'Личная подписка'}
                        <Chip
                          label={isTeam ? 'Команда' : 'Игрок'}
                          size="small"
                          color={isTeam ? 'secondary' : 'primary'}
                          sx={{ ml: 1, verticalAlign: 'middle', height: 22 }}
                        />
                      </AlertTitle>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Тариф: <strong>{userSub.subscription_name || userSub.subscription_id}</strong>
                        {userSub.team_name ? (
                          <>
                            {' '}
                            · команда «<strong>{userSub.team_name}</strong>»
                          </>
                        ) : null}
                      </Typography>
                      {userSub.end_date && (
                        <Typography variant="body2" color="text.secondary">
                          Действует до{' '}
                          <strong>{new Date(userSub.end_date).toLocaleDateString('ru-RU')}</strong>
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {isTeam
                          ? 'VIP, смена никнейма и бонусы доступны как участнику команды с подпиской.'
                          : 'VIP, смена никнейма и бонусы по вашей личной подписке.'}
                      </Typography>
                      {isTeam && !canCancelSubscription(userSub, leaderTeams) && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                          Отменить может только лидер команды
                        </Typography>
                      )}
                      {canCancelSubscription(userSub, leaderTeams) && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => setCancelTarget(userSub)}
                          sx={{ mt: 1.5 }}
                        >
                          Отменить {isTeam ? 'командную' : 'личную'} подписку
                        </Button>
                      )}
                    </Alert>
                  );
                })}
              </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {subscriptions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Нет доступных подписок для вашей роли
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={4} justifyContent="center">
              {subscriptions.map((sub) => (
                <Grid
                  size={{
                    xs: 12,
                    sm: subscriptions.length === 1 ? 12 : 6,
                    md: subscriptions.length === 1 ? 8 : 6,
                    lg: subscriptions.length === 1 ? 6 : 4,
                  }}
                  key={sub.id}
                >
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'visible',
                      borderRadius: 4,
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: 8,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 120,
                        background: getCardGradient(sub.target_type),
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                      }}
                    />

                    <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', mt: 3, zIndex: 1 }}>
                      {getCardIcon(sub.target_type)}
                    </Box>

                    <CardContent sx={{ flexGrow: 1, pt: 0 }}>
                      <Box textAlign="center" sx={{ mt: 2 }}>
                        <Chip
                          label={getTargetTypeLabel(sub.target_type)}
                          color={
                            sub.target_type === 'user'
                              ? 'primary'
                              : sub.target_type === 'team'
                                ? 'secondary'
                                : 'warning'
                          }
                          size="small"
                          sx={{ mb: 2, fontWeight: 600 }}
                        />
                        <Typography variant="h5" component="h2" fontWeight="bold" gutterBottom>
                          {sub.name}
                        </Typography>
                        <Box sx={{ my: 2 }}>
                          <Typography
                            variant="h2"
                            component="span"
                            fontWeight="bold"
                            sx={{
                              fontSize: { xs: '2.5rem', sm: '3rem' },
                              color:
                                sub.target_type === 'user'
                                  ? '#667eea'
                                  : sub.target_type === 'team'
                                    ? '#f5576c'
                                    : '#fa709a',
                            }}
                          >
                            {sub.price}
                          </Typography>
                          <Typography variant="h6" component="span" color="text.secondary">
                            {' '}
                            ₽
                          </Typography>
                          <Typography variant="body2" component="span" color="text.secondary">
                            {' '}
                            /мес
                          </Typography>
                        </Box>
                      </Box>

                      {sub.target_type === 'team' && leaderTeams.length === 0 && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Только лидер команды может оформить эту подписку
                        </Alert>
                      )}

                      {sub.target_type === 'team' && leaderTeams.length > 0 && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          Команду можно выбрать при подтверждении оплаты. VIP получат все участники.
                        </Typography>
                      )}

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                        Что вы получаете:
                      </Typography>
                      <List dense disablePadding>
                        {sub.benefits.map((benefit, idx) => (
                          <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={benefit} primaryTypographyProps={{ variant: 'body2' }} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>

                    <CardActions sx={{ p: 3, pt: 0, flexDirection: 'column', gap: 1 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={() => openPayConfirm(sub)}
                        disabled={
                          subscribing === sub.id || isPlanAlreadyActive(sub.target_type) || isTeamPayDisabled(sub)
                        }
                        startIcon={<AccountBalanceWalletIcon />}
                      >
                        {subscribing === sub.id
                          ? 'Оплата...'
                          : `Оплатить (${walletBalance.toFixed(0)} ₽ на кошельке)`}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>

      <Dialog
        open={!!cancelTarget}
        onClose={() => !cancelling && setCancelTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Отмена подписки</DialogTitle>
        <DialogContent>
          <Typography>Уверены ли вы, что хотите удалить?</Typography>
          {cancelTarget && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {getSubKind(cancelTarget) === 'team'
                  ? `Командная подписка «${cancelTarget.team_name || cancelTarget.subscription_name || 'команда'}»`
                  : `Личная подписка «${cancelTarget.subscription_name || 'игрок'}»`}
              </Typography>
              {getSubKind(cancelTarget) === 'team' && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 1.5 }}>
                  Подписка будет отменена для всех участников команды. VIP и бонусы команды перестанут действовать у
                  каждого игрока.
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling}>
            Нет
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmCancel} disabled={cancelling}>
            {cancelling ? 'Отмена...' : 'Да, удалить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmTarget} onClose={() => !subscribing && setConfirmTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Подтверждение оплаты</DialogTitle>
        <DialogContent>
          {confirmTarget && (
            <>
              <Typography gutterBottom>
                Списать <strong>{confirmTarget.sub.price} ₽</strong> с кошелька за подписку «
                {confirmTarget.sub.name}»?
              </Typography>

              {confirmTarget.sub.target_type === 'team' && leaderTeams.length > 0 && (
                <FormControl fullWidth size="small" sx={{ mt: 2, mb: 1 }}>
                  <InputLabel id="confirm-team-label">Команда</InputLabel>
                  <Select
                    labelId="confirm-team-label"
                    label="Команда"
                    value={confirmTeamId}
                    onChange={(e) => setConfirmTeamId(e.target.value)}
                  >
                    {leaderTeams.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name} ({t.members.length} уч.)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {confirmTarget.sub.target_type === 'team' && selectedConfirmTeam && (
                <Typography variant="body2" color="text.secondary">
                  VIP и бонусы получат все {selectedConfirmTeam.members.length} участников команды «
                  {selectedConfirmTeam.name}».
                </Typography>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Баланс после оплаты: {(walletBalance - confirmTarget.sub.price).toFixed(0)} ₽
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTarget(null)} disabled={!!subscribing}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleConfirmPay} disabled={!!subscribing}>
            Подтвердить оплату
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMsg}
        autoHideDuration={6000}
        onClose={() => setSuccessMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SubscriptionPage;
