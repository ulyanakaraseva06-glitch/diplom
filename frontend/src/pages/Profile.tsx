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
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChatIcon from '@mui/icons-material/Chat';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import PeopleIcon from '@mui/icons-material/People';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  role: string;
  game: string[];        // ← массив строк
  rank: string[];        // ← массив строк
  achievements: string[]; // ← массив строк
}

const Profile: React.FC = () => {
  const { isAuthenticated, user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profile, setProfile] = useState<UserProfile>({
    id: 0,
    email: '',
    username: '',
    role: '',
    game: [],
    rank: [],
    achievements: [],
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const userResponse = await fetch('http://localhost:8080/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const userData = await userResponse.json();
      
      const mongoResponse = await fetch('http://localhost:8080/api/client/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const mongoData = await mongoResponse.json();
      
      setProfile({
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.role,
        game: Array.isArray(mongoData.game) ? mongoData.game : mongoData.game ? [mongoData.game] : [],
        rank: Array.isArray(mongoData.rank) ? mongoData.rank : mongoData.rank ? [mongoData.rank] : [],
        achievements: Array.isArray(mongoData.achievements) ? mongoData.achievements : [],
      });
    } catch (err) {
      setError('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  // Преобразование строки в массив (разделители: запятая, пробел, точка с запятой)
  const stringToArray = (str: string): string[] => {
    if (!str.trim()) return [];
    // Разделяем по запятой, пробелу, точке с запятой
    return str.split(/[ ,;]+/).filter(s => s.trim() !== '');
  };

  // Преобразование массива в строку для отображения
  const arrayToString = (arr: string[]): string => {
    return arr.join(', ');
  };

  const handleArrayChange = (field: 'game' | 'rank' | 'achievements') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const arrayValue = stringToArray(event.target.value);
    setProfile(prev => ({ ...prev, [field]: arrayValue }));
    setError('');
    setSuccess('');
  };

  const handleChange = (field: keyof UserProfile) => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (field === 'game' || field === 'rank' || field === 'achievements') {
      handleArrayChange(field)(event);
    } else {
      setProfile(prev => ({ ...prev, [field]: event.target.value }));
    }
    setError('');
    setSuccess('');
  };

  const saveToPostgres = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:8080/api/auth/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ username: profile.username }),
    });
    
    if (!response.ok) {
      throw new Error('Ошибка сохранения');
    }
    
    const updatedUser = await response.json();
    updateUser({ username: updatedUser.username });
    return updatedUser;
  };

  const saveToMongo = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:8080/api/client/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        game: profile.game,
        rank: profile.rank,
        achievements: profile.achievements,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Ошибка сохранения');
    }
    return response.json();
  };

  const handleSaveField = async (fieldName: string, saveFunction: () => Promise<any>) => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await saveFunction();
      setSuccess(`"${fieldName}" сохранено`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Ошибка сохранения "${fieldName}"`);
    } finally {
      setSaving(false);
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

  const handleFriends = () => {
    alert('Страница друзей в разработке');
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
                <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
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

      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 2 }}>
            Назад к турнирам
          </Button>
          
          <Paper sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
              Мой профиль
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Email"
                  value={profile.email}
                  disabled
                />
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth
                    label="Имя пользователя"
                    value={profile.username}
                    onChange={handleChange('username')}
                  />
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSaveField('Имя пользователя', saveToPostgres)}
                    disabled={saving}
                    sx={{ mt: 1, minWidth: 120 }}
                  >
                    Сохранить
                  </Button>
                </Box>
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Divider />
                <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
                  Дополнительная информация
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Вводите значения через запятую, пробел или точку с запятой
                </Typography>
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth
                    label="Любимые игры (через запятую)"
                    value={arrayToString(profile.game)}
                    onChange={handleChange('game')}
                    placeholder="CS2, Dota 2, Valorant"
                  />
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSaveField('Любимые игры', saveToMongo)}
                    disabled={saving}
                    sx={{ mt: 1, minWidth: 120 }}
                  >
                    Сохранить
                  </Button>
                </Box>
                {profile.game.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {profile.game.map((g, idx) => (
                      <Chip key={idx} label={g} size="small" />
                    ))}
                  </Box>
                )}
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth
                    label="Ранги (через запятую)"
                    value={arrayToString(profile.rank)}
                    onChange={handleChange('rank')}
                    placeholder="Silver, Gold, Platinum"
                  />
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSaveField('Ранги', saveToMongo)}
                    disabled={saving}
                    sx={{ mt: 1, minWidth: 120 }}
                  >
                    Сохранить
                  </Button>
                </Box>
                {profile.rank.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {profile.rank.map((r, idx) => (
                      <Chip key={idx} label={r} size="small" color="primary" />
                    ))}
                  </Box>
                )}
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth
                    label="Достижения (через запятую)"
                    value={arrayToString(profile.achievements)}
                    onChange={handleChange('achievements')}
                    multiline
                    rows={3}
                    placeholder="Победитель турнира, MVP сезона, Лучший игрок"
                  />
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSaveField('Достижения', saveToMongo)}
                    disabled={saving}
                    sx={{ mt: 1, minWidth: 120 }}
                  >
                    Сохранить
                  </Button>
                </Box>
                {profile.achievements.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {profile.achievements.map((a, idx) => (
                      <Chip key={idx} label={a} size="small" color="success" />
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default Profile;