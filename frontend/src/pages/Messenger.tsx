import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Badge,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChatIcon from '@mui/icons-material/Chat';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import PeopleIcon from '@mui/icons-material/People';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';

interface ChatMessage {
  id: number;
  text: string;
  fromMe: boolean;
  time: string;
  userId?: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  unreadCount?: number;
}

const Messenger: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузка списка пользователей (только с ролью user)
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const allUsers = await response.json();
      // Фильтруем: только пользователи с ролью 'user', исключаем текущего пользователя
      const filteredUsers = allUsers.filter((u: User) => u.role === 'user' && u.id !== user?.id);
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Ошибка загрузки пользователей', err);
    }
  };

  // Загрузка сообщений с выбранным пользователем
  const loadMessages = async (userId: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const storageKey = `chat_${user?.id}_${userId}`;
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([
          {
            id: 1,
            text: `Чат с пользователем. Здесь будут ваши сообщения.`,
            fromMe: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            userId: userId,
          },
        ]);
      }
    } catch (err) {
      console.error('Ошибка загрузки сообщений', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (selected: User) => {
    setSelectedUser(selected);
    loadMessages(selected.id);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !selectedUser) return;
    
    const newMessage: ChatMessage = {
      id: messages.length + 1,
      text: message,
      fromMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userId: selectedUser.id,
    };
    
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    
    const storageKey = `chat_${user?.id}_${selectedUser.id}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
    
    setMessage('');
    
    // Имитация ответа через 1-2 секунды
    setTimeout(() => {
      const replyMessage: ChatMessage = {
        id: updatedMessages.length + 1,
        text: `Сообщение получено (${newMessage.text})`,
        fromMe: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userId: selectedUser.id,
      };
      const newUpdatedMessages = [...updatedMessages, replyMessage];
      setMessages(newUpdatedMessages);
      localStorage.setItem(storageKey, JSON.stringify(newUpdatedMessages));
    }, 1000 + Math.random() * 2000);
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

  const handleBack = () => {
    navigate('/client/tournaments');
  };

  const isGuest = !isAuthenticated && !localStorage.getItem('token');

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Киберспортивная платформа
          </Typography>
          
          {!isGuest && isAuthenticated && (
            <>
              <Button color="inherit" startIcon={<ChatIcon />} onClick={() => navigate('/messenger')} sx={{ mr: 1 }}>
                Мессенджер
              </Button>
              <Button color="inherit" startIcon={<SubscriptionsIcon />} onClick={handleSubscription} sx={{ mr: 1 }}>
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

      <Container maxWidth="xl">
        <Box sx={{ mt: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
            Назад к турнирам
          </Button>
          
          <Paper sx={{ height: 600, display: 'flex' }}>
            {/* Список пользователей слева */}
            <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
              <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                Пользователи
              </Typography>
              <List>
                {users.map((u) => (
                  <ListItem
                    key={u.id}
                    component="button"
                    onClick={() => handleSelectUser(u)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: selectedUser?.id === u.id ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={u.username} 
                      secondary={u.email}
                      primaryTypographyProps={{ fontWeight: selectedUser?.id === u.id ? 'bold' : 'normal' }}
                    />
                  </ListItem>
                ))}
              </List>
              {users.length === 0 && (
                <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  Нет других игроков
                </Typography>
              )}
            </Box>
            
            {/* Область чата справа */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {!selectedUser ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                  <Typography color="text.secondary">Выберите пользователя для начала чата</Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f5f5' }}>
                    <Typography variant="h6">
                      Чат с {selectedUser.username}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {loading ? (
                      <Typography align="center">Загрузка...</Typography>
                    ) : messages.length === 0 ? (
                      <Typography align="center" color="text.secondary">Нет сообщений. Напишите что-нибудь!</Typography>
                    ) : (
                      <List>
                        {messages.map((msg) => (
                          <ListItem
                            key={msg.id}
                            sx={{
                              justifyContent: msg.fromMe ? 'flex-end' : 'flex-start',
                              pl: msg.fromMe ? 4 : 0,
                              pr: msg.fromMe ? 0 : 4,
                            }}
                          >
                            <Paper
                              sx={{
                                p: 1.5,
                                maxWidth: '70%',
                                bgcolor: msg.fromMe ? 'primary.main' : 'grey.100',
                                color: msg.fromMe ? 'white' : 'text.primary',
                                borderRadius: 2,
                              }}
                            >
                              <ListItemText
                                primary={msg.text}
                                secondary={msg.time}
                                secondaryTypographyProps={{
                                  color: msg.fromMe ? 'grey.200' : 'text.secondary',
                                  fontSize: '0.7rem',
                                }}
                              />
                            </Paper>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                  
                  <Divider />
                  
                  <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      placeholder="Введите сообщение..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      size="small"
                    />
                    <Button
                      variant="contained"
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                    >
                      <SendIcon />
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </Paper>
          
        </Box>
      </Container>
    </>
  );
};

export default Messenger;