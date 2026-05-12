import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChatIcon from '@mui/icons-material/Chat';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import PeopleIcon from '@mui/icons-material/People';

interface Tournament {
  id: number;
  title: string;
  game: string;
  max_teams: number;
  number_rounds: number;
  winner_team: string;
  info_tournament: string;
}

const ClientTournaments: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Гость — если нет токена и нет user в localStorage
  const isGuest = !isAuthenticated && !localStorage.getItem('token');

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/client/tournaments');
      if (!response.ok) {
        throw new Error('Ошибка загрузки');
      }
      const data = await response.json();
      setTournaments(data);
    } catch (err) {
      setError('Ошибка загрузки турниров');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (tournamentId: number) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setRegistering(tournamentId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/client/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tournament_id: tournamentId }),
      });

      if (response.ok) {
        alert('Вы успешно зарегистрированы на турнир!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Ошибка регистрации');
      }
    } catch (err) {
      alert('Ошибка регистрации');
    } finally {
      setRegistering(null);
    }
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

  const handleLogin = () => {
    navigate('/login');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMessenger = () => {
    // TODO: переход на страницу мессенджера
    alert('Страница мессенджера в разработке');
  };

 const handleSubscription = () => {
  //Переход на страницу подписок
   navigate('/subscription');
  };

  const handleFriends = () => {
    //переход на страницу друзей
    navigate('/friends');
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
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
          
          {isGuest ? (
            <Button color="inherit" startIcon={<LoginIcon />} onClick={handleLogin}>
              Войти
            </Button>
          ) : isAuthenticated ? (
            <>
              {/* Кнопка Мессенджер */}
              <Button color="inherit" startIcon={<ChatIcon />} onClick={handleMessenger} sx={{ mr: 1 }}>
                Мессенджер
              </Button>
              
              {/* Кнопка Подписка */}
              <Button color="inherit" startIcon={<SubscriptionsIcon />} onClick={handleSubscription} sx={{ mr: 1 }}>
                Подписка
              </Button>
              
              {/* Кнопка Друзья */}
              <Button color="inherit" startIcon={<PeopleIcon />} onClick={handleFriends} sx={{ mr: 2 }}>
                Друзья
              </Button>
              
              {/* Кнопка Админ-панель (только для менеджеров) */}
              {user?.role === 'manager' && (
                <Button color="inherit" startIcon={<AdminPanelSettingsIcon />} onClick={handleAdminPanel} sx={{ mr: 2 }}>
                  Админ-панель
                </Button>
              )}
              
              {/* Выпадающее меню профиля */}
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
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem onClick={handleProfile}>
                  <AccountCircleIcon sx={{ mr: 1 }} /> Мой профиль
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1 }} /> Выйти
                </MenuItem>
              </Menu>
            </>
          ) : null}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Турниры
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {tournaments.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
              Нет доступных турниров
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Название</strong></TableCell>
                    <TableCell><strong>Игра</strong></TableCell>
                    <TableCell><strong>Макс. команд</strong></TableCell>
                    <TableCell><strong>Раундов</strong></TableCell>
                    <TableCell><strong>Доп. информация</strong></TableCell>
                    <TableCell align="center"><strong>Действие</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tournaments.map((tournament) => (
                    <TableRow key={tournament.id} hover>
                      <TableCell>{tournament.title}</TableCell>
                      <TableCell>{tournament.game}</TableCell>
                      <TableCell>{tournament.max_teams}</TableCell>
                      <TableCell>{tournament.number_rounds}</TableCell>
                      <TableCell>{tournament.info_tournament || '—'}</TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleRegister(tournament.id)}
                          disabled={registering === tournament.id}
                        >
                          {registering === tournament.id ? 'Регистрация...' : 'Зарегистрироваться'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Container>
    </>
  );
};

export default ClientTournaments;