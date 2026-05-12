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
    navigate('/messenger');
  };

  const handleSubscription = () => {
    navigate('/subscription');
  };

  const handleFriends = () => {
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
          <Typography variant="h6" sx={{ flexGrow: 1, fontFamily: 'Orbitron, monospace', fontWeight: 700, letterSpacing: '0.1em' }}>
            🎮 КИБЕРСПОРТ ПЛАТФОРМА
          </Typography>
          
          {isGuest ? (
            <Button color="inherit" startIcon={<LoginIcon />} onClick={handleLogin} sx={{ '&:hover': { textShadow: '0 0 5px #00d4ff' } }}>
              Войти
            </Button>
          ) : isAuthenticated ? (
            <>
              {user?.role === 'manager' ? (
                <Button 
                  color="inherit" 
                  startIcon={<AdminPanelSettingsIcon />} 
                  onClick={handleAdminPanel} 
                  sx={{ 
                    mr: 2,
                    '&:hover': { 
                      textShadow: '0 0 5px #ff0044',
                      backgroundColor: 'rgba(255, 0, 68, 0.1)'
                    }
                  }}
                >
                  Админ-панель
                </Button>
              ) : (
                <>
                  <Button color="inherit" startIcon={<ChatIcon />} onClick={handleMessenger} sx={{ mr: 1, '&:hover': { textShadow: '0 0 5px #00d4ff' } }}>
                    Мессенджер
                  </Button>
                  <Button color="inherit" startIcon={<SubscriptionsIcon />} onClick={handleSubscription} sx={{ mr: 1, '&:hover': { textShadow: '0 0 5px #00d4ff' } }}>
                    Подписка
                  </Button>
                  <Button color="inherit" startIcon={<PeopleIcon />} onClick={handleFriends} sx={{ mr: 2, '&:hover': { textShadow: '0 0 5px #00d4ff' } }}>
                    Друзья
                  </Button>
                </>
              )}
              
              {user?.role === 'manager' ? (
                <Button 
                  color="inherit" 
                  onClick={handleLogout} 
                  sx={{ 
                    ml: 2,
                    '&:hover': { 
                      textShadow: '0 0 5px #ff0044',
                      backgroundColor: 'rgba(255, 0, 68, 0.1)'
                    }
                  }}
                >
                  Выйти
                </Button>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleMenuOpen}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1, border: '2px solid #00d4ff' }}>
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
              )}
            </>
          ) : null}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              fontWeight: 800, 
              letterSpacing: '0.15em', 
              textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #00d4ff 0%, #ff0044 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
              mb: 3
            }}
          >
            ТУРНИРЫ
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(255, 0, 68, 0.1)', border: '1px solid #ff0044' }}>{error}</Alert>}

          {tournaments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ color: '#a0a0b0', letterSpacing: '0.05em' }}>
                НЕТ ДОСТУПНЫХ ТУРНИРОВ
              </Typography>
              <Typography variant="body2" sx={{ color: '#a0a0b0', mt: 1 }}>
                Зайдите позже — турниры скоро появятся
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ overflow: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0, 212, 255, 0.08)' }}>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: '0.05em', borderBottom: '2px solid #00d4ff' }}><strong>НАЗВАНИЕ</strong></TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: '0.05em', borderBottom: '2px solid #00d4ff' }}><strong>ИГРА</strong></TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: '0.05em', borderBottom: '2px solid #00d4ff' }}><strong>МАКС. КОМАНД</strong></TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: '0.05em', borderBottom: '2px solid #00d4ff' }}><strong>РАУНДОВ</strong></TableCell>
                    <TableCell sx={{ fontWeight: 700, letterSpacing: '0.05em', borderBottom: '2px solid #00d4ff' }}><strong>ДОП. ИНФОРМАЦИЯ</strong></TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, letterSpacing: '0.05em', borderBottom: '2px solid #00d4ff' }}><strong>ДЕЙСТВИЕ</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tournaments.map((tournament) => (
                    <TableRow 
                      key={tournament.id} 
                      hover 
                      sx={{ 
                        '&:hover': { 
                          backgroundColor: 'rgba(0, 212, 255, 0.05)',
                          transition: 'all 0.2s'
                        } 
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{tournament.title}</TableCell>
                      <TableCell>{tournament.game}</TableCell>
                      <TableCell>{tournament.max_teams}</TableCell>
                      <TableCell>{tournament.number_rounds}</TableCell>
                      <TableCell>{tournament.info_tournament || '—'}</TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleRegister(tournament.id)}
                          disabled={registering === tournament.id}
                          sx={{
                            background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5eeaff 0%, #00d4ff 100%)',
                              boxShadow: '0 0 20px rgba(0, 212, 255, 0.7)',
                            },
                            '&.Mui-disabled': {
                              background: 'rgba(0, 212, 255, 0.3)',
                              color: '#ffffff'
                            }
                          }}
                        >
                          {registering === tournament.id ? 'РЕГИСТРАЦИЯ...' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
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