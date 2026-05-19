import React, { useEffect, useState, useRef } from 'react';
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
import AttachFileIcon from '@mui/icons-material/AttachFile';
import NavBar from '../components/NavBar';
import EmojiPicker from '../components/EmojiPicker';
import { clientApi, ChatPreview, ChatMessage } from '../api/clientApi';

const Messenger: React.FC = () => {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [selected, setSelected] = useState<ChatPreview | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    try {
      const list = await clientApi.getChats(chatSearch);
      setChats(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadChats();
  }, [chatSearch]);

  const loadMessages = async (chat: ChatPreview) => {
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
  };

  const handleSelect = (chat: ChatPreview) => {
    setSelected(chat);
    loadMessages(chat);
  };

  const handleSend = async (imageUrl?: string) => {
    if (!selected || (!text.trim() && !imageUrl)) return;
    setSending(true);
    try {
      const msg = await clientApi.sendMessage(selected.id, text.trim(), imageUrl);
      setMessages((prev) => [...prev, msg]);
      setText('');
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      alert('Не удалось отправить сообщение');
    } finally {
      setSending(false);
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
                    key={c.id}
                    selected={selected?.id === c.id}
                    onClick={() => handleSelect(c)}
                  >
                    <ListItemAvatar>
                      <Avatar src={c.avatar_url || undefined}>
                        {c.is_support ? <SupportAgentIcon /> : <PersonIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={c.username}
                      secondary={c.is_support ? 'Служба поддержки' : 'Игрок'}
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
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                    <Typography variant="h6">{selected.username}</Typography>
                    {selected.is_support && (
                      <Typography variant="caption" color="text.secondary">
                        Сообщения видны менеджеру в панели поддержки
                      </Typography>
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
                            {msg.text && <Typography variant="body2">{msg.text}</Typography>}
                            {msg.image_url && (
                              <Box
                                component="img"
                                src={msg.image_url}
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
