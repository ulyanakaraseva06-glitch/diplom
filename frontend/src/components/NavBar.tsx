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

const NavBar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleThemes = () => {
    handleMenuClose();
    navigate('/themes');
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

  const handleAdminPanel = () => {
    navigate('/dashboard');
  };

  const handleMyTournaments = () => {
    navigate('/my-tournaments');
  };

  const isGuest = !isAuthenticated && !localStorage.getItem('token');

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography 
          variant="h6" 
          sx={{ flexGrow: 1, cursor: 'pointer' }} 
          onClick={() => navigate('/client/tournaments')}
        >
          🎮 Киберспортивная платформа
        </Typography>
        
        {!isGuest && isAuthenticated && (
          <>
            <Button color="inherit" startIcon={<Chat />} onClick={handleMessenger} sx={{ mr: 1 }}>
              Мессенджер
            </Button>
            <Button color="inherit" startIcon={<Subscriptions />} onClick={handleSubscription} sx={{ mr: 1 }}>
              Подписка
            </Button>
            
            {/* Кнопка "Друзья" только для обычных пользователей */}
            {user?.role === 'user' && (
              <Button color="inherit" startIcon={<People />} onClick={handleFriends} sx={{ mr: 1 }}>
                Друзья
              </Button>
            )}
            
            {/* Кнопка "Мои турниры" для организатора */}
            {user?.role === 'organizer' && (
              <Button color="inherit" startIcon={<EmojiEvents />} onClick={handleMyTournaments} sx={{ mr: 1 }}>
                Мои турниры
              </Button>
            )}
            
            {/* Кнопка "Админ-панель" для менеджера */}
            {user?.role === 'manager' && (
              <Button color="inherit" startIcon={<AdminPanelSettings />} onClick={handleAdminPanel} sx={{ mr: 1 }}>
                Админ-панель
              </Button>
            )}
            
            {/* Меню пользователя (аватар) */}
            <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', ml: 2 }} onClick={handleMenuOpen}>
              <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {user?.username}
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
              <MenuItem onClick={handleProfile}>
                <AccountCircle sx={{ mr: 1 }} /> Мой профиль
              </MenuItem>
              
              <MenuItem onClick={handleThemes}>
                <Computer sx={{ mr: 1 }} /> Темы
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