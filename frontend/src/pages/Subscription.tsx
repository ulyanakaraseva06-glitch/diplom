import React, { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavBar from '../components/NavBar';
import StarIcon from '@mui/icons-material/Star';
import PeopleIcon from '@mui/icons-material/People';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DiamondIcon from '@mui/icons-material/Diamond';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { clientApi } from '../api/clientApi';

interface Subscription {
  id: string;
  name: string;
  price: number;
  benefits: string[];
  target_type: string;
}

const SubscriptionPage: React.FC = () => {
  const { theme } = useThemeContext();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    fetchSubscriptions();
    fetchUserSubscription();
    clientApi.getWallet().then((w) => setWalletBalance(w.balance)).catch(() => {});
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/subscriptions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setSubscriptions(data);
    } catch (err) {
      setError('Ошибка загрузки подписок');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/subscriptions/my', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserSubscription(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки подписки пользователя', err);
    }
  };

  const handlePayWithWallet = async (subscriptionId: string, price: number) => {
    if (walletBalance < price) {
      alert(`Недостаточно средств. Баланс: ${walletBalance} ₽, нужно: ${price} ₽`);
      return;
    }
    setSubscribing(subscriptionId);
    try {
      const data = await clientApi.paySubscription(subscriptionId);
      setWalletBalance(data.balance);
      alert('Подписка оплачена с кошелька!');
      fetchUserSubscription();
    } catch {
      alert('Ошибка оплаты. Пополните кошелёк в меню «Мой кошелёк»');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Отменить подписку?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        alert('Подписка отменена');
        setUserSubscription(null);
      } else {
        alert('Ошибка отмены подписки');
      }
    } catch (err) {
      alert('Ошибка отмены подписки');
    }
  };

  const handleBack = () => {
    navigate('/client/tournaments');
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
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
            Назад к турнирам
          </Button>
          
          <Typography variant="h4" gutterBottom align="center" sx={{ mb: 1, fontWeight: 700 }}>
            Выберите подписку
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Получите доступ к расширенным возможностям платформы
          </Typography>

          {userSubscription && userSubscription.is_active && (
            <Paper sx={{ p: 2, mb: 4, bgcolor: theme === 'light' ? '#e8f5e9' : theme === 'dark' ? '#1b5e20' : 'rgba(0, 255, 136, 0.1)', textAlign: 'center', border: theme === 'cyber' ? '1px solid #00ff88' : 'none' }}>
              <Typography variant="h6">
                У вас активна подписка! 🎉
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Действует до: {new Date(userSubscription.end_date).toLocaleDateString()}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleCancelSubscription}
                sx={{ mt: 1 }}
              >
                Отменить подписку
              </Button>
            </Paper>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                    lg: subscriptions.length === 1 ? 6 : 4
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
                    {/* Градиентный фон карточки */}
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
                    
                    {/* Иконка */}
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        mt: 3,
                        zIndex: 1,
                      }}
                    >
                      {getCardIcon(sub.target_type)}
                    </Box>
                    
                    <CardContent sx={{ flexGrow: 1, pt: 0 }}>
                      <Box textAlign="center" sx={{ mt: 2 }}>
                        <Chip 
                          label={getTargetTypeLabel(sub.target_type)} 
                          color={sub.target_type === 'user' ? 'primary' : sub.target_type === 'team' ? 'secondary' : 'warning'}
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
                              color: sub.target_type === 'user' ? '#667eea' : sub.target_type === 'team' ? '#f5576c' : '#fa709a'
                            }}
                          >
                            {sub.price}
                          </Typography>
                          <Typography variant="h6" component="span" color="text.secondary">
                            ₽
                          </Typography>
                          <Typography variant="body2" component="span" color="text.secondary">
                            /мес
                          </Typography>
                        </Box>
                      </Box>
                      
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
                            <ListItemText 
                              primary={benefit} 
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                    
                    <CardActions sx={{ p: 3, pt: 0, flexDirection: 'column', gap: 1 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={() => handlePayWithWallet(sub.id, sub.price)}
                        disabled={subscribing === sub.id || (userSubscription && userSubscription.is_active)}
                        startIcon={<AccountBalanceWalletIcon />}
                      >
                        {subscribing === sub.id
                          ? 'Оплата...'
                          : `Оплатить с кошелька (${walletBalance} ₽)`}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </>
  );
};

export default SubscriptionPage;