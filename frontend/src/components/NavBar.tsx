import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import Logout from '@mui/icons-material/Logout';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Chat from '@mui/icons-material/Chat';
import Subscriptions from '@mui/icons-material/Subscriptions';
import People from '@mui/icons-material/People';
import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import Computer from '@mui/icons-material/Computer';
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet';
import Login from '@mui/icons-material/Login';
import DashboardIcon from '@mui/icons-material/Dashboard';

const API = 'http://localhost:8080';

const navAvatarSrc = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API}${url}`;
};

const getLogoSrc = (theme: string) => {
  switch (theme) {
    case 'light':
      return `${process.env.PUBLIC_URL}/logo_pikmi.jpg`;
    case 'dark':
      return `${process.env.PUBLIC_URL}/logo_bad.jpg`;
    default:
      return `${process.env.PUBLIC_URL}/logo.jpg`;
  }
};

const NavBar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme } = useThemeContext();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const hasToken = !!localStorage.getItem('token');
  const showAuth = isAuthenticated || hasToken;
  const showGuest = !showAuth;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const go = (path: string) => {
    handleMenuClose();
    navigate(path);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  // Проверка ролей
  const isUser = user?.role === 'user';
  const isOrganizer = user?.role === 'organizer';
  const isManager = user?.role === 'manager';

  return (
    <AppBar position="static">
      <Toolbar sx={{ minHeight: { xs: 100, sm: 120 } }}>
        <Box
          sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/client/tournaments')}
        >
          <Box
            component="img"
            src={getLogoSrc(theme)}
            alt="GAMER.OK"
            sx={{
              height: { xs: 96, sm: 112 },
              maxWidth: { xs: 840, sm: 1140 },
              width: 'auto',
              objectFit: 'contain',
              objectPosition: 'left center',
              display: 'block',
            }}
          />
        </Box>

        {showGuest && (
          <Button color="inherit" startIcon={<Login />} onClick={() => navigate('/login')}>
            Войти
          </Button>
        )}

        {showAuth && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Мессенджер - доступен всем авторизованным */}
            <Button color="inherit" startIcon={<Chat />} onClick={() => navigate('/messenger')}>
              Мессенджер
            </Button>

            {/* Подписка - доступна всем авторизованным */}
            <Button color="inherit" startIcon={<Subscriptions />} onClick={() => navigate('/subscription')}>
              Подписка
            </Button>

            {/* Друзья - только для обычных пользователей */}
            {isUser && (
              <Button color="inherit" startIcon={<People />} onClick={() => navigate('/friends')}>
                Друзья
              </Button>
            )}

            {/* Мои турниры - для организатора */}
            {isOrganizer && (
              <Button color="inherit" startIcon={<EmojiEvents />} onClick={() => navigate('/my-tournaments')}>
                Мои турниры
              </Button>
            )}

            {/* Админ-панель - только для менеджера */}
            {isManager && (
              <Button color="inherit" startIcon={<DashboardIcon />} onClick={() => navigate('/dashboard')}>
                Админ-панель
              </Button>
            )}

            {/* Аватар и меню профиля */}
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', ml: 1 }} onClick={handleMenuOpen}>
              <Avatar
                src={navAvatarSrc(user?.avatar_url)}
                sx={{ width: 40, height: 40, mr: 1, border: '2px solid rgba(0, 212, 255, 0.5)' }}
              >
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {user?.username || 'Профиль'}
              </Typography>
            </Box>

            {/* Выпадающее меню */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => go('/profile')}>
                <AccountCircle sx={{ mr: 1 }} /> Мой профиль
              </MenuItem>
              <MenuItem onClick={() => go('/wallet')}>
                <AccountBalanceWallet sx={{ mr: 1 }} /> Мой кошелёк
              </MenuItem>
              <MenuItem onClick={() => go('/themes')}>
                <Computer sx={{ mr: 1 }} /> Темы
              </MenuItem>
              <MenuItem onClick={() => go('/client/tournaments')}>
                <EmojiEvents sx={{ mr: 1 }} /> Турниры
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} /> Выйти
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;