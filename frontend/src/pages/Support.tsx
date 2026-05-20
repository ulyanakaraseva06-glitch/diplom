import Grid from '@mui/material/Grid';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supportApi } from '../api/support';
import EmojiPicker from '../components/EmojiPicker';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { IconButton, Tooltip } from '@mui/material';
import { SupportMessage, ActiveChat } from '../types';
import { mediaUrl } from '../utils/media';
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

const appendUnique = (prev: SupportMessage[], msg: SupportMessage) => {
  if (prev.some((m) => m.id === msg.id)) return prev;
  return [...prev, msg];
};

const Support: React.FC = () => {
  const { token, isManager } = useAuth();
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

  const loadActiveChats = useCallback(async () => {
    try {
      const response = await supportApi.getActiveChats();
      setChats(response.data);
      const unreadMap: Record<number, number> = {};
      response.data.forEach((chat) => {
        if (chat.unread_count > 0) {
          unreadMap[chat.id] = chat.unread_count;
        }
      });
      setUnreadCounts(unreadMap);
    } catch (err) {
      console.error('Ошибка загрузки активных чатов:', err);
      setError('Ошибка загрузки списка чатов');
    }
  }, []);

  useEffect(() => {
    if (isManager) {
      loadActiveChats();
    }
  }, [isManager, loadActiveChats]);

  useEffect(() => {
    if (!selectedUserId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const response = await supportApi.getMessages(selectedUserId);
        setMessages(response.data || []);
        await supportApi.markAsRead(selectedUserId);
        setUnreadCounts((prev) => ({ ...prev, [selectedUserId]: 0 }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки сообщений';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedUserId]);

  useEffect(() => {
    if (!token || !selectedUserId) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    selectedUserIdRef.current = selectedUserId;

    const wsUrl = `ws://localhost:8080/ws/support?user_id=${selectedUserId}&token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as SupportMessage;
      if (selectedUserIdRef.current === data.user_id) {
        setMessages((prev) => appendUnique(prev, data));
        if (data.is_from_user) {
          loadActiveChats();
        }
      }
    };

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [token, selectedUserId, loadActiveChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessageWithImage = async (imageUrl: string) => {
    if (!selectedUserId) return;
    const url = imageUrl.startsWith('http') ? imageUrl : `http://localhost:8080${imageUrl}`;
    try {
      const { data } = await supportApi.sendMessage(selectedUserId, { message: '', image_url: url });
      setMessages((prev) => appendUnique(prev, data));
      await loadActiveChats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка отправки изображения';
      setError(msg);
    }
  };

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    setSending(true);
    try {
      const { data } = await supportApi.sendMessage(selectedUserId, { message: newMessage });
      setMessages((prev) => appendUnique(prev, data));
      setNewMessage('');
      await loadActiveChats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка отправки сообщения';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  if (!isManager) {
    return null;
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
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
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          badgeContent={unreadCounts[chat.id] || 0}
                          color="error"
                          invisible={!unreadCounts[chat.id]}
                        >
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText primary={chat.username} secondary={chat.email} />
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
                  <Typography color="text.secondary">Выберите чат</Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6">Чат с пользователем #{selectedUserId}</Typography>
                  </Box>

                  <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {loading ? (
                      <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : !messages || messages.length === 0 ? (
                      <Typography color="text.secondary" align="center" sx={{ mt: 4 }}>
                        Нет сообщений
                      </Typography>
                    ) : (
                      <List>
                        {messages.map((msg) => (
                          <ListItem
                            key={msg.id}
                            sx={{ justifyContent: msg.is_from_user ? 'flex-start' : 'flex-end' }}
                          >
                            <Paper
                              sx={{
                                p: 1.5,
                                maxWidth: '70%',
                                bgcolor: msg.is_from_user ? 'grey.100' : 'primary.main',
                                color: msg.is_from_user ? 'text.primary' : 'white',
                                borderRadius: 2,
                              }}
                            >
                              <ListItemText
                                primary={
                                  <>
                                    {msg.message}
                                    {msg.image_url && (
                                      <Box
                                        component="img"
                                        src={mediaUrl(msg.image_url)}
                                        alt=""
                                        sx={{ maxWidth: '100%', display: 'block', mt: 1, borderRadius: 1 }}
                                      />
                                    )}
                                  </>
                                }
                                secondary={`${msg.is_from_user ? msg.username || 'Пользователь' : msg.manager_name || 'Менеджер'} • ${new Date(msg.created_at).toLocaleString()}`}
                                secondaryTypographyProps={{
                                  color: msg.is_from_user ? 'text.secondary' : 'grey.200',
                                  fontSize: '0.75rem',
                                }}
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
                    <EmojiPicker onPick={(emoji) => setNewMessage((prev) => prev + emoji)} />
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      maxRows={4}
                      placeholder="Введите сообщение..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sending}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                    >
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
