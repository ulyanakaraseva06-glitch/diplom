import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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

const API = 'http://localhost:8080';

const navAvatarSrc = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API}${url}`;
};

const NavBar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
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

  return (
    <AppBar position="static">
      <Toolbar sx={{ minHeight: { xs: 100, sm: 120 } }}>
        <Box
          sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/client/tournaments')}
        >
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/logo.jpg`}
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
          <>
            <Button color="inherit" startIcon={<Chat />} onClick={() => navigate('/messenger')} sx={{ mr: 1 }}>
              Мессенджер
            </Button>
            <Button color="inherit" startIcon={<Subscriptions />} onClick={() => navigate('/subscription')} sx={{ mr: 1 }}>
              Подписка
            </Button>

            {user?.role === 'user' && (
              <Button color="inherit" startIcon={<People />} onClick={() => navigate('/friends')} sx={{ mr: 1 }}>
                Друзья
              </Button>
            )}

            {user?.role === 'organizer' && (
              <Button color="inherit" startIcon={<EmojiEvents />} onClick={() => navigate('/my-tournaments')} sx={{ mr: 1 }}>
                Мои турниры
              </Button>
            )}

            {user?.role === 'manager' && (
              <Button color="inherit" startIcon={<AdminPanelSettings />} onClick={() => navigate('/dashboard')} sx={{ mr: 1 }}>
                Админ-панель
              </Button>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', ml: 2 }} onClick={handleMenuOpen}>
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
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
