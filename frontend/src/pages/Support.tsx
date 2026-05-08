import Grid from '@mui/material/Grid';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supportApi } from '../api/support';
import { usersApi } from '../api/users';
import { SupportMessage, User } from '../types';
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
  CircularProgress,
  Alert,
  Badge,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';

const Support: React.FC = () => {
  const { user, token, isManager } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectedUserIdRef = useRef<number | null>(null);

  // Загрузка списка пользователей
// Загрузка списка пользователей (только игроки для менеджера)
useEffect(() => {
  if (isManager) {
    const loadUsers = async () => {
      try {
        const response = await usersApi.getAll();
        // Фильтруем только игроков (role = 'user')
        const players = (response.data || []).filter(u => u.role === 'user');
        setUsers(players);
      } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
        setError('Ошибка загрузки списка пользователей');
      }
    };
    loadUsers();
  }
}, [isManager]);

  // Загрузка сообщений при выборе пользователя
  useEffect(() => {
    if (!selectedUserId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const response = await supportApi.getMessages(selectedUserId);
        setMessages(response.data || []);
        await supportApi.markAsRead(selectedUserId);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Ошибка загрузки сообщений');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    const loadUnreadCounts = async () => {
      try {
        const response = await supportApi.getUnreadCount(selectedUserId);
        setUnreadCounts(prev => ({ ...prev, [selectedUserId]: response.data.unread_count }));
      } catch (err) {
        console.error('Failed to load unread count', err);
      }
    };
    loadUnreadCounts();
  }, [selectedUserId]);

  // WebSocket подключение
  useEffect(() => {
    if (!token || !selectedUserId) return;

    // Закрываем старое соединение
    if (wsRef.current) {
      wsRef.current.close();
    }

    selectedUserIdRef.current = selectedUserId;

    const wsUrl = `ws://localhost:8080/ws/support?user_id=${selectedUserId}&token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected for user', selectedUserId);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Проверяем, что сообщение для текущего выбранного пользователя
      if (selectedUserIdRef.current === data.user_id) {
        setMessages(prev => [...prev, data]);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected for user', selectedUserId, event.code);
    };

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [token, selectedUserId]);

  // Автоскролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    setSending(true);
    try {
      if (isManager) {
        // Отправляем через HTTP
        await supportApi.sendMessage(selectedUserId, { message: newMessage });
      } else {
        // Пользователь отправляет через WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            message: newMessage,
            is_from_user: true 
          }));
        }
      }
      setNewMessage('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка отправки сообщения');
    } finally {
      setSending(false);
    }
  };

  // Рендер для менеджера
  if (isManager) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ mt: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Чат поддержки</Typography>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/dashboard')}
          >
            На главную
          </Button>
        </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ height: 600, overflow: 'auto' }}>
                <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>Пользователи</Typography>
                {!users || users.length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Нет пользователей</Typography>
                ) : (
                  <List>
                    {users.map((u) => (
                      <ListItem
                        key={u.id}
                        component="button"
                        onClick={() => setSelectedUserId(u.id)}
                        sx={{ cursor: 'pointer', bgcolor: selectedUserId === u.id ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <ListItemAvatar>
                          <Badge badgeContent={unreadCounts[u.id] || 0} color="error" invisible={!unreadCounts[u.id]}>
                            <Avatar><PersonIcon /></Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText primary={u.username} secondary={u.email} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
                {!selectedUserId ? (
                  <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                    <Typography color="text.secondary">Выберите пользователя для чата</Typography>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Typography variant="h6">Чат с пользователем #{selectedUserId}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                      {loading ? (
                        <Box display="flex" justifyContent="center" sx={{ mt: 4 }}><CircularProgress /></Box>
                      ) : !messages || messages.length === 0 ? (
                        <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>Нет сообщений</Typography>
                      ) : (
                        <List>
                          {messages.map((msg) => (
                            <ListItem key={msg.id} sx={{ justifyContent: msg.is_from_user ? 'flex-start' : 'flex-end' }}>
                              <Paper sx={{ p: 1.5, maxWidth: '70%', bgcolor: msg.is_from_user ? 'grey.100' : 'primary.main', color: msg.is_from_user ? 'text.primary' : 'white', borderRadius: 2 }}>
                                <ListItemText
                                  primary={msg.message}
                                  secondary={`${msg.is_from_user ? (msg.username || 'Пользователь') : (msg.manager_name || 'Менеджер')} • ${new Date(msg.created_at).toLocaleString()}`}
                                  secondaryTypographyProps={{ color: msg.is_from_user ? 'text.secondary' : 'grey.200', fontSize: '0.75rem' }}
                                />
                              </Paper>
                            </ListItem>
                          ))}
                          <div ref={messagesEndRef} />
                        </List>
                      )}
                    </Box>
                    <Divider />
                    <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="Введите сообщение..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={sending}
                      />
                      <Button variant="contained" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                        <SendIcon />
                      </Button>
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    );
  }

  // Рендер для обычного пользователя
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Чат поддержки</Typography>
        <Button
          variant="outlined"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/dashboard')}
        >
          На главную
        </Button>
      </Box>
        <Paper sx={{ height: 500, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : !messages || messages.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                Нет сообщений. Напишите нам!
              </Typography>
            ) : (
              <List>
                {messages.map((msg) => (
                  <ListItem key={msg.id} sx={{ justifyContent: msg.is_from_user ? 'flex-start' : 'flex-end' }}>
                    <Paper sx={{ p: 1.5, maxWidth: '70%', bgcolor: msg.is_from_user ? 'grey.100' : 'primary.main', color: msg.is_from_user ? 'text.primary' : 'white', borderRadius: 2 }}>
                      <ListItemText
                        primary={msg.message}
                        secondary={new Date(msg.created_at).toLocaleString()}
                        secondaryTypographyProps={{ color: msg.is_from_user ? 'text.secondary' : 'grey.200', fontSize: '0.75rem' }}
                      />
                    </Paper>
                  </ListItem>
                ))}
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>
          <Divider />
          <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Введите сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={sending}
            />
            <Button variant="contained" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
              <SendIcon />
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Support;