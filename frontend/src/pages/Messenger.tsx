import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  IconButton,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NavBar from '../components/NavBar';
import EmojiPicker from '../components/EmojiPicker';
import { clientApi, ChatPreview, ChatMessage } from '../api/clientApi';
import { mediaUrl } from '../utils/media';
import { confirmDelete } from '../utils/confirmDelete';

const Messenger: React.FC = () => {
  const location = useLocation();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [selected, setSelected] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (chat: ChatPreview) => {
    setLoading(true);
    try {
      const msgs = await clientApi.getMessages(chat.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      console.error(e);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    (chat: ChatPreview) => {
      setSelected(chat);
      loadMessages(chat);
    },
    [loadMessages]
  );

  const loadChats = useCallback(async () => {
    try {
      const list = await clientApi.getChats(chatSearch);
      setChats(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    }
  }, [chatSearch]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    const peerId = (location.state as { chatPeerId?: number })?.chatPeerId;
    if (peerId == null) return;
    clientApi.getChats().then((list) => {
      const chat = list.find((c) => c.id === peerId);
      if (chat) handleSelect(chat);
    });
  }, [location.state, handleSelect]);

  const handleSend = async (imageUrl?: string) => {
    if (!selected || (!text.trim() && !imageUrl)) return;
    setSending(true);
    try {
      const msg = await clientApi.sendMessage(selected.id, text.trim(), imageUrl);
      setMessages((prev) => [...prev, msg]);
      setText('');
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось отправить сообщение';
      alert(msg || 'Не удалось отправить сообщение');
      console.error('sendMessage failed:', e);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!selected) return;
    if (selected.is_support) {
      alert('Чат поддержки нельзя удалить');
      return;
    }
    if (!confirmDelete()) return;
    try {
      await clientApi.deleteChat(selected.id);
      setSelected(null);
      setMessages([]);
      await loadChats();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Не удалось удалить чат';
      alert(msg);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await clientApi.uploadImage(file);
      await handleSend(url);
    } catch {
      alert('Ошибка загрузки фото');
    }
    e.target.value = '';
  };

  return (
    <>
      <NavBar />
      <Container maxWidth="xl">
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            Мессенджер
          </Typography>
          <Paper sx={{ height: 620, display: 'flex' }}>
            <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Tooltip title="Поиск по никнейму">
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Поиск чата..."
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                  />
                </Tooltip>
              </Box>
              <List sx={{ overflow: 'auto', flex: 1 }}>
                {(chats ?? []).map((c) => (
                  <ListItemButton
                    key={c.is_team ? `team-${c.team_id}` : c.id}
                    selected={selected?.id === c.id}
                    onClick={() => handleSelect(c)}
                  >
                    <ListItemAvatar>
                      <Avatar src={mediaUrl(c.avatar_url)}>
                        {c.is_support ? (
                          <SupportAgentIcon />
                        ) : c.is_team ? (
                          <GroupsIcon />
                        ) : (
                          <PersonIcon />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={c.username}
                      secondary={
                        c.is_support ? 'Служба поддержки' : c.is_team ? 'Командный чат' : 'Игрок'
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {!selected ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">Выберите чат слева</Typography>
                </Box>
              ) : (
                <>
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="h6">{selected.username}</Typography>
                      {selected.is_support && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Сообщения видны менеджеру в панели поддержки
                        </Typography>
                      )}
                      {selected.is_team && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Групповой чат команды
                        </Typography>
                      )}
                    </Box>
                    {!selected.is_support && (
                      <Tooltip title={selected.is_team ? 'Скрыть чат' : 'Удалить чат'}>
                        <IconButton color="error" onClick={handleDeleteChat} aria-label="Удалить чат">
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {loading ? (
                      <CircularProgress size={32} />
                    ) : (
                      (messages ?? []).map((msg) => (
                        <Box
                          key={String(msg.id)}
                          sx={{ display: 'flex', justifyContent: msg.from_me ? 'flex-end' : 'flex-start', mb: 1.5 }}
                        >
                          <Paper
                            sx={{
                              p: 1.5,
                              maxWidth: '70%',
                              bgcolor: msg.from_me ? 'primary.main' : 'grey.100',
                              color: msg.from_me ? 'primary.contrastText' : 'text.primary',
                            }}
                          >
                            {!msg.from_me && msg.username && selected.is_team && (
                              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                                {msg.username}
                              </Typography>
                            )}
                            {msg.text && <Typography variant="body2">{msg.text}</Typography>}
                            {msg.image_url && (
                              <Box
                                component="img"
                                src={mediaUrl(msg.image_url)}
                                alt="вложение"
                                sx={{ maxWidth: '100%', borderRadius: 1, mt: msg.text ? 1 : 0 }}
                              />
                            )}
                            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Paper>
                        </Box>
                      ))
                    )}
                    <div ref={bottomRef} />
                  </Box>

                  <Divider />
                  <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <input type="file" accept="image/*" hidden ref={fileRef} onChange={handleFile} />
                    <Tooltip title="Прикрепить фото">
                      <IconButton onClick={() => fileRef.current?.click()}>
                        <AttachFileIcon />
                      </IconButton>
                    </Tooltip>
                    <EmojiPicker onPick={(e) => setText((t) => t + e)} />
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      maxRows={4}
                      placeholder="Сообщение..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button variant="contained" onClick={() => handleSend()} disabled={sending || !text.trim()}>
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
