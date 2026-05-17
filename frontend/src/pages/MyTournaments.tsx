// MyTournaments.tsx
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Chat as ChatIcon,
  Subscriptions as SubscriptionsIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { tournamentsApi } from '../api/tournaments';
import { Tournament, TournamentCreate } from '../types';

const MyTournaments: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState<TournamentCreate>({
    title: '',
    game: '',
    description: '',
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    registration_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    entry_fee: 0,
    prize_pool: 0,
    max_teams: 16,
  });

  useEffect(() => {
    // Проверка: только организатор или менеджер могут сюда попасть
    if (user?.role !== 'organizer' && user?.role !== 'manager') {
      navigate('/client/tournaments');
      return;
    }
    loadMyTournaments();
  }, [user, navigate]);

  const loadMyTournaments = async () => {
    try {
      setLoading(true);
      // Получаем все турниры и фильтруем по организатору
      const response = await tournamentsApi.getAll();
      const allTournaments = response.data || [];
      const myTourns = allTournaments.filter(t => t.organizer_id === user?.id);
      setTournaments(myTourns);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки турниров');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTournament(null);
    setFormData({
      title: '',
      game: '',
      description: '',
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      registration_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      entry_fee: 0,
      prize_pool: 0,
      max_teams: 16,
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      title: tournament.title,
      game: tournament.game,
      description: tournament.description || '',
      start_date: tournament.start_date.slice(0, 16),
      registration_deadline: tournament.registration_deadline.slice(0, 16),
      entry_fee: tournament.entry_fee,
      prize_pool: tournament.prize_pool,
      max_teams: tournament.max_teams,
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить турнир? Это действие нельзя отменить.')) return;
    try {
      await tournamentsApi.delete(id);
      loadMyTournaments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка удаления');
    }
  };

  const handleSubmit = async () => {
    try {
      const formattedStartDate = formData.start_date 
        ? new Date(formData.start_date).toISOString()
        : '';
      const formattedRegistrationDeadline = formData.registration_deadline 
        ? new Date(formData.registration_deadline).toISOString()
        : '';

      const dataToSend = {
        ...formData,
        start_date: formattedStartDate,
        registration_deadline: formattedRegistrationDeadline,
      };

      if (editingTournament) {
        const updateData: any = {};
        if (dataToSend.title !== editingTournament.title) updateData.title = dataToSend.title;
        if (dataToSend.game !== editingTournament.game) updateData.game = dataToSend.game;
        if (dataToSend.description !== (editingTournament.description || '')) updateData.description = dataToSend.description;
        if (dataToSend.start_date !== editingTournament.start_date) updateData.start_date = dataToSend.start_date;
        if (dataToSend.registration_deadline !== editingTournament.registration_deadline) {
          updateData.registration_deadline = dataToSend.registration_deadline;
        }
        if (dataToSend.entry_fee !== editingTournament.entry_fee) updateData.entry_fee = dataToSend.entry_fee;
        if (dataToSend.prize_pool !== editingTournament.prize_pool) updateData.prize_pool = dataToSend.prize_pool;
        if (dataToSend.max_teams !== editingTournament.max_teams) updateData.max_teams = dataToSend.max_teams;
        
        if (Object.keys(updateData).length === 0) {
          setOpenDialog(false);
          return;
        }
        
        await tournamentsApi.update(editingTournament.id, updateData);
      } else {
        await tournamentsApi.create(dataToSend);
      }
      setOpenDialog(false);
      loadMyTournaments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'entry_fee' || name === 'prize_pool' || name === 'max_teams'
        ? Number(value)
        : value,
    }));
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
    navigate('/login');
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleMessenger = () => {
    navigate('/messenger');
  };

  const handleSubscription = () => {
    navigate('/subscription');
  };

  const handleBack = () => {
    navigate('/client/tournaments');
  };

  const getStatusChip = (status: string) => {
    const statusMap: Record<string, { label: string; color: any }> = {
      pending: { label: 'Ожидает модерации', color: 'warning' },
      approved: { label: 'Одобрен', color: 'success' },
      ongoing: { label: 'Идёт', color: 'info' },
      completed: { label: 'Завершён', color: 'default' },
      cancelled: { label: 'Отменён', color: 'error' },
    };
    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            🎮 Мои турниры
          </Typography>
          
          {isAuthenticated && (
            <>
              <Button color="inherit" startIcon={<ChatIcon />} onClick={handleMessenger} sx={{ mr: 1 }}>
                Мессенджер
              </Button>
              <Button color="inherit" startIcon={<SubscriptionsIcon />} onClick={handleSubscription} sx={{ mr: 2 }}>
                Подписка
              </Button>
              
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Назад к турнирам
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Создать турнир
            </Button>
          </Box>

          <Typography variant="h4" gutterBottom>
            Мои турниры
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : tournaments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <EmojiEventsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                У вас пока нет турниров
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Создайте свой первый турнир!
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                Создать турнир
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell><strong>Название</strong></TableCell>
                    <TableCell><strong>Игра</strong></TableCell>
                    <TableCell><strong>Дата начала</strong></TableCell>
                    <TableCell><strong>Призовой фонд</strong></TableCell>
                    <TableCell><strong>Статус</strong></TableCell>
                    <TableCell align="center"><strong>Действия</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tournaments.map((tournament) => (
                    <TableRow key={tournament.id} hover>
                      <TableCell>{tournament.id}</TableCell>
                      <TableCell>
                        <Button
                          variant="text"
                          onClick={() => navigate(`/tournaments/${tournament.id}`)}
                          sx={{ textTransform: 'none', p: 0, fontWeight: 'normal' }}
                        >
                          {tournament.title}
                        </Button>
                      </TableCell>
                      <TableCell>{tournament.game}</TableCell>
                      <TableCell>{new Date(tournament.start_date).toLocaleString()}</TableCell>
                      <TableCell>{tournament.prize_pool.toLocaleString()} ₽</TableCell>
                      <TableCell>{getStatusChip(tournament.status)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEdit(tournament)}
                          title="Редактировать"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(tournament.id)}
                          title="Удалить"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Container>

      {/* Диалог создания/редактирования турнира */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTournament ? 'Редактировать турнир' : 'Создать турнир'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название турнира"
            name="title"
            value={formData.title}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Игра"
            name="game"
            value={formData.game}
            onChange={handleChange}
            margin="normal"
            required
            placeholder="CS2, Dota 2, Valorant, etc."
          />
          <TextField
            fullWidth
            label="Описание"
            name="description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
            placeholder="Опишите формат турнира, правила и другую важную информацию"
          />
          <TextField
            fullWidth
            label="Дата начала"
            name="start_date"
            type="datetime-local"
            value={formData.start_date}
            onChange={handleChange}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Дедлайн регистрации"
            name="registration_deadline"
            type="datetime-local"
            value={formData.registration_deadline}
            onChange={handleChange}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Вступительный взнос (₽)"
            name="entry_fee"
            type="number"
            value={formData.entry_fee}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Призовой фонд (₽)"
            name="prize_pool"
            type="number"
            value={formData.prize_pool}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Максимум команд"
            name="max_teams"
            type="number"
            value={formData.max_teams}
            onChange={handleChange}
            margin="normal"
            inputProps={{ min: 2, max: 64 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingTournament ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MyTournaments;