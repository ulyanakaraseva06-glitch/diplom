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
  Chip,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChatIcon from '@mui/icons-material/Chat';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  created_at: string;
}

const Friends: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState<number | null>(null);
  const [friends, setFriends] = useState<number[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchFriends();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const allUsers = await response.json();
      // Фильтруем только пользователей с ролью 'user', исключаем текущего пользователя
      const filteredUsers = allUsers.filter((u: User) => u.role === 'user' && u.id !== user?.id);
      setUsers(filteredUsers);
    } catch (err) {
      setError('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/client/friends', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const friendsList = await response.json();
        setFriends(Array.isArray(friendsList) ? friendsList : []);
      } else {
        setFriends([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки друзей', err);
      setFriends([]);
    }
  };

  const handleAddFriend = async (friendId: number) => {
    setAdding(friendId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/client/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friend_id: friendId }),
      });
      
      if (response.ok) {
        setFriends([...friends, friendId]);
        alert('Пользователь добавлен в друзья!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Ошибка добавления');
      }
    } catch (err) {
      alert('Ошибка добавления');
    } finally {
      setAdding(null);
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

  const handleSubscription = () => {
    alert('Страница подписки в разработке');
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleBack = () => {
    navigate('/client/tournaments');
  };

  const isGuest = !isAuthenticated && !localStorage.getItem('token');

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
              <Button color="inherit" startIcon={<SubscriptionsIcon />} onClick={handleSubscription} sx={{ mr: 1 }}>
                Подписка
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
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Игроки
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell><strong>Имя пользователя</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Дата регистрации</strong></TableCell>
                    <TableCell align="center"><strong>Действие</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        {friends && friends.includes(u.id) ? (
                          <Chip label="В друзьях" color="success" size="small" />
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PersonAddIcon />}
                            onClick={() => handleAddFriend(u.id)}
                            disabled={adding === u.id}
                          >
                            {adding === u.id ? 'Добавление...' : 'Добавить в друзья'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {users.length === 0 && !error && (
              <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                Нет других игроков
              </Typography>
            )}
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default Friends;