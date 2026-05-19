import Grid from '@mui/material/Grid';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supportApi } from '../api/support';
import EmojiPicker from '../components/EmojiPicker';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { IconButton, Tooltip } from '@mui/material';
import { SupportMessage, ActiveChat } from '../types';
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
  const [chats, setChats] = useState<ActiveChat[]>([]);
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [sendingFile, setSendingFile] = useState(false);

  // Загрузка активных чатов для менеджера
  useEffect(() => {
    if (isManager) {
      const loadActiveChats = async () => {
        try {
          const response = await supportApi.getActiveChats();
          setChats(response.data);
          const unreadMap: Record<number, number> = {};
          response.data.forEach(chat => {
            if (chat.unread_count > 0) {
              unreadMap[chat.id] = chat.unread_count;
            }
          });
          setUnreadCounts(unreadMap);
        } catch (err) {
          console.error('Ошибка загрузки активных чатов:', err);
          setError('Ошибка загрузки списка чатов');
        }
      };
      loadActiveChats();
    }
  }, [isManager]);

  // Загрузка сообщений при выборе пользователя
  useEffect(() => {
    if (!selectedUserId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const response = await supportApi.getMessages(selectedUserId);
console.log('Loaded messages:', response.data);
setMessages(response.data || []);
        await supportApi.markAsRead(selectedUserId);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Ошибка загрузки сообщений');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedUserId]);

  // WebSocket подключение
  useEffect(() => {
    if (!token || !selectedUserId) return;

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
  console.log('WebSocket message keys:', Object.keys(data));  // добавить
  console.log('WebSocket message:', data);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSendingFile(true);
    try {
      const response = await supportApi.uploadImage(file);
      await sendMessageWithImage(response.data.url);
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
      setError('Не удалось загрузить изображение');
    } finally {
      setSendingFile(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const sendMessageWithImage = async (imageUrl: string) => {
  if (!selectedUserId) return;

  // Добавляем полный URL
  const fullUrl = imageUrl.startsWith('http') ? imageUrl : `http://localhost:8080${imageUrl}`;

  try {
    await supportApi.sendMessage(selectedUserId, { message: '', image_url: fullUrl });
  } catch (err: any) {
    setError(err.response?.data?.message || 'Ошибка отправки изображения');
  }
};

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    setSending(true);
    try {
      await supportApi.sendMessage(selectedUserId, { message: newMessage });
      setNewMessage('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка отправки сообщения');
    } finally {
      setSending(false);
    }
  };

  // Проверка, что пользователь менеджер
  if (!isManager) {
    return null; // Пользовательский чат реализован в другом модуле
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Чат поддержки</Typography>
          <Button variant="outlined" startIcon={<HomeIcon />} onClick={() => navigate('/dashboard')}>
            На главную
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <Grid container spacing={3}>
          {/* Список активных чатов */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ height: 600, overflow: 'auto' }}>
              <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                Активные чаты
              </Typography>
              {!chats || chats.length === 0 ? (
                <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  Нет активных чатов
                </Typography>
              ) : (
                <List>
                  {chats.map((chat) => (
                    <ListItem
                      key={chat.id}
                      component="button"
                      onClick={() => setSelectedUserId(chat.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selectedUserId === chat.id ? 'action.selected' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemAvatar>
                        <Badge badgeContent={unreadCounts[chat.id] || 0} color="error" invisible={!unreadCounts[chat.id]}>
                          <Avatar><PersonIcon /></Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText primary={chat.username} secondary={chat.email} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Окно чата */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
              {!selectedUserId ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                  <Typography color="text.secondary">Выберите чат</Typography>
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
                                primary={
                                  <>
                                    {msg.message}
                                    {msg.image_url && (
                                      <Box component="img" src={msg.image_url} alt="" sx={{ maxWidth: '100%', display: 'block', mt: 1, borderRadius: 1 }} />
                                    )}
                                  </>
                                }
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
                  <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      ref={fileRef}
                      onChange={handleFileUpload}
                    />
                    <Tooltip title="Прикрепить фото">
                      <IconButton onClick={() => fileRef.current?.click()} disabled={sendingFile}>
                        <AttachFileIcon />
                      </IconButton>
                    </Tooltip>
                    <EmojiPicker onPick={(emoji) => setNewMessage(prev => prev + emoji)} />
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      maxRows={4}
                      placeholder="Введите сообщение..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
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
};

export default Support;