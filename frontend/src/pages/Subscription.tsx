import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChatIcon from '@mui/icons-material/Chat';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Subscription {
  id: string;
  name: string;
  price: number;
  benefits: string[];
  target_type: string;
}

const SubscriptionPage: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  useEffect(() => {
    fetchSubscriptions();
    fetchUserSubscription();
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

  const handleSubscribe = async (subscriptionId: string) => {
    setSubscribing(subscriptionId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription_id: subscriptionId }),
      });
      
      if (response.ok) {
        alert('Подписка оформлена!');
        fetchUserSubscription();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Ошибка оформления подписки');
      }
    } catch (err) {
      alert('Ошибка оформления подписки');
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/client/tournaments');
  };

  const handleAdminPanel = () => {
    handleMenuClose();
    navigate('/dashboard');
  };

  const handleMessenger = () => {
    alert('Страница мессенджера в разработке');
  };

  const handleFriends = () => {
    navigate('/friends');
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleBack = () => {
    navigate('/client/tournaments');
  };

  const isGuest = !isAuthenticated && !localStorage.getItem('token');

  const getCardColor = (targetType: string) => {
    switch (targetType) {
      case 'user': return '#e3f2fd';
      case 'team': return '#e8f5e9';
      case 'organizer': return '#fff3e0';
      default: return '#f5f5f5';
    }
  };

  const getCardBorderColor = (targetType: string) => {
    switch (targetType) {
      case 'user': return '#1976d2';
      case 'team': return '#2e7d32';
      case 'organizer': return '#ed6c02';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" sx={{ mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Киберспортивная платформа
          </Typography>
          
          {!isGuest && isAuthenticated && (
            <>
              <Button color="inherit" startIcon={<ChatIcon />} onClick={handleMessenger} sx={{ mr: 1 }}>
                Мессенджер
              </Button>
              <Button color="inherit" startIcon={<SubscriptionsIcon />} onClick={() => navigate('/subscription')} sx={{ mr: 1 }}>
                Подписка
              </Button>
              <Button color="inherit" startIcon={<PeopleIcon />} onClick={handleFriends} sx={{ mr: 2 }}>
                Друзья
              </Button>
              
              {user?.role === 'manager' && (
                <Button color="inherit" startIcon={<AdminPanelSettingsIcon />} onClick={handleAdminPanel} sx={{ mr: 2 }}>
                  Админ-панель
                </Button>
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleMenuOpen}>
                <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  {user?.username}
                </Typography>
              </Box>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem onClick={handleProfile}>
                  <AccountCircleIcon sx={{ mr: 1 }} /> Мой профиль
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1 }} /> Выйти
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
            Назад к турнирам
          </Button>
          
          <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
            Подписки
          </Typography>

          {userSubscription && userSubscription.is_active && (
            <Paper sx={{ p: 2, mb: 4, bgcolor: '#e8f5e9', textAlign: 'center' }}>
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

          <Grid container spacing={3}>
            {subscriptions.map((sub) => (
              <Grid size={{ xs: 12, md: 4 }} key={sub.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderTop: `4px solid ${getCardBorderColor(sub.target_type)}`,
                    bgcolor: getCardColor(sub.target_type),
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h5" component="h2" fontWeight="bold">
                        {sub.name}
                      </Typography>
                      <Chip 
                        label={sub.target_type === 'user' ? 'Для игрока' : sub.target_type === 'team' ? 'Для команды' : 'Для организатора'} 
                        color={sub.target_type === 'user' ? 'primary' : sub.target_type === 'team' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="h3" component="div" fontWeight="bold" color="primary" sx={{ mb: 2 }}>
                      {sub.price} ₽
                      <Typography variant="caption" color="text.secondary" component="span">
                        /мес
                      </Typography>
                    </Typography>
                    
                    <List dense>
                      {sub.benefits.map((benefit, idx) => (
                        <ListItem key={idx} sx={{ pl: 0 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={benefit} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={() => handleSubscribe(sub.id)}
                      disabled={subscribing === sub.id || (userSubscription && userSubscription.is_active)}
                      startIcon={<StarIcon />}
                    >
                      {subscribing === sub.id 
                        ? 'Оформление...' 
                        : (userSubscription && userSubscription.is_active) 
                          ? 'Уже активна' 
                          : 'Оформить'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default SubscriptionPage;