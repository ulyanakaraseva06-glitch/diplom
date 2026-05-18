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
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import NavBar from '../components/NavBar';

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
}

const Messenger: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

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
      const filteredUsers = allUsers.filter((u: User) => u.role === 'user' && u.id !== user?.id);
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Ошибка загрузки пользователей', err);
    }
  };

  const loadMessages = async (userId: number) => {
    setLoading(true);
    try {
      const storageKey = `chat_${user?.id}_${userId}`;
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([]);
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
  };

  return (
    <>
      <NavBar />
      <Container maxWidth="xl">
        <Box sx={{ mt: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/client/tournaments')} sx={{ mb: 2 }}>
            Назад к турнирам
          </Button>
          
          <Paper sx={{ height: 600, display: 'flex' }}>
            {/* Список пользователей */}
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
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar><PersonIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={u.username} secondary={u.email} />
                  </ListItem>
                ))}
              </List>
            </Box>
            
            {/* Область чата */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {!selectedUser ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '100%' }}>
                  <Typography color="text.secondary">Выберите пользователя для начала чата</Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f5f5' }}>
                    <Typography variant="h6">Чат с {selectedUser.username}</Typography>
                  </Box>
                  
                  <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {messages.map((msg) => (
                      <Box key={msg.id} sx={{ display: 'flex', justifyContent: msg.fromMe ? 'flex-end' : 'flex-start', mb: 1 }}>
                        <Paper sx={{ p: 1, bgcolor: msg.fromMe ? 'primary.main' : 'grey.100', color: msg.fromMe ? 'white' : 'text.primary' }}>
                          <Typography variant="body2">{msg.text}</Typography>
                          <Typography variant="caption" color={msg.fromMe ? 'grey.200' : 'text.secondary'}>
                            {msg.time}
                          </Typography>
                        </Paper>
                      </Box>
                    ))}
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
                    <Button variant="contained" onClick={handleSendMessage} disabled={!message.trim()}>
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