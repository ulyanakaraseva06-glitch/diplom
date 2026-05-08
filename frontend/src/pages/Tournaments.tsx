import Grid from '@mui/material/Grid';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { tournamentsApi } from '../api/tournaments';
import { Tournament, TournamentCreate } from '../types';
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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import Papa from 'papaparse';
import DownloadIcon from '@mui/icons-material/Download';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  Search as SearchIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

const TournamentStatusChip: React.FC<{ status: Tournament['status'] }> = ({ status }) => {
  const statusMap = {
    pending: { label: 'Ожидает', color: 'warning' as const },
    approved: { label: 'Одобрен', color: 'success' as const },
    ongoing: { label: 'Идет', color: 'info' as const },
    completed: { label: 'Завершен', color: 'default' as const },
    cancelled: { label: 'Отменен', color: 'error' as const },
  };
  const { label, color } = statusMap[status];
  return <Chip label={label} color={color} size="small" />;
};

const Tournaments: React.FC = () => {
  const { isManager, isOrganizer } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  
  // Фильтры
  const [filterGame, setFilterGame] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [games, setGames] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<TournamentCreate>({
    title: '',
    game: '',
    description: '',
    start_date: '',
    registration_deadline: '',
    entry_fee: 0,
    prize_pool: 0,
    max_teams: 16,
  });

  const loadTournaments = async () => {
  try {
    setLoading(true);
    const params: any = {};
    if (filterGame) params.game = filterGame;
    if (filterStatus) params.status = filterStatus;
    
    const response = await tournamentsApi.getAll(params);
    let filtered = response.data || [];
    
    if (searchTitle) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(searchTitle.toLowerCase())
      );
    }
    
    setTournaments(filtered);
    setError('');
  } catch (err: any) {
    setError(err.response?.data?.message || 'Ошибка загрузки турниров');
    setTournaments([]);
  } finally {
    setLoading(false);
  }
};

  const loadUniqueGames = async () => {
  try {
    const response = await tournamentsApi.getAll();
    const gamesList = response.data || [];
    const gameSet = new Set<string>();
    gamesList.forEach((t) => {
      if (t.game) {
        gameSet.add(t.game);
      }
    });
    setGames(Array.from(gameSet));
  } catch (err) {
    console.error('Ошибка загрузки игр', err);
  }
};

  useEffect(() => {
    loadTournaments();
  }, [filterGame, filterStatus, searchTitle]);

  useEffect(() => {
    loadUniqueGames();
  }, []);

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
    if (!window.confirm('Удалить турнир?')) return;
    try {
      await tournamentsApi.delete(id);
      loadTournaments();
      loadUniqueGames();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка удаления');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await tournamentsApi.approve(id);
      loadTournaments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка подтверждения');
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
      loadTournaments();
      loadUniqueGames();
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
  const exportToCSV = () => {
  if (!tournaments || tournaments.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  // Подготавливаем данные для CSV
  const exportData = tournaments.map(t => ({
    'ID': t.id,
    'Название': t.title,
    'Игра': t.game,
    'Дата начала': new Date(t.start_date).toLocaleString(),
    'Дедлайн регистрации': new Date(t.registration_deadline).toLocaleString(),
    'Вступительный взнос': t.entry_fee,
    'Призовой фонд': t.prize_pool,
    'Максимум команд': t.max_teams,
    'Статус': t.status === 'pending' ? 'Ожидает' : 
             t.status === 'approved' ? 'Одобрен' :
             t.status === 'ongoing' ? 'Идет' :
             t.status === 'completed' ? 'Завершен' : 'Отменен',
    'Организатор': t.organizer?.username || t.organizer_id,
    'Создан': new Date(t.created_at).toLocaleString(),
  }));

  // Конвертируем в CSV
  const csv = Papa.unparse(exportData);
  
  // Скачиваем файл
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `турниры_${new Date().toISOString().slice(0, 19)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
  const resetFilters = () => {
    setFilterGame('');
    setFilterStatus('');
    setSearchTitle('');
  };

  return (
    <Container maxWidth="lg">
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
  <Typography variant="h4">Управление турнирами</Typography>
  <Box sx={{ display: 'flex', gap: 2 }}>
    <Button
      variant="outlined"
      startIcon={<DownloadIcon />}
      onClick={exportToCSV}
    >
      Экспорт CSV
    </Button>
    <Button
      variant="outlined"
      startIcon={<HomeIcon />}
      onClick={() => navigate('/dashboard')}
    >
      На главную
    </Button>
    {(isManager || isOrganizer) && (
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleOpenCreate}
      >
        Создать турнир
      </Button>
    )}
  </Box>
</Box>

      {/* Панель фильтров */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Поиск по названию"
              variant="outlined"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Игра</InputLabel>
              <Select
                value={filterGame}
                label="Игра"
                onChange={(e) => setFilterGame(e.target.value)}
              >
                <MenuItem value="">Все игры</MenuItem>
                {games.map((game) => (
                  <MenuItem key={game} value={game}>{game}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Статус</InputLabel>
              <Select
                value={filterStatus}
                label="Статус"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">Все статусы</MenuItem>
                <MenuItem value="pending">Ожидает</MenuItem>
                <MenuItem value="approved">Одобрен</MenuItem>
                <MenuItem value="ongoing">Идет</MenuItem>
                <MenuItem value="completed">Завершен</MenuItem>
                <MenuItem value="cancelled">Отменен</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={resetFilters}
            >
              Сбросить фильтры
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
      <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
        <CircularProgress />
      </Box>
    ) : !tournaments || tournaments.length === 0 ? (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Нет турниров</Typography>
      </Paper>
    ) : (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Игра</TableCell>
              <TableCell>Дата начала</TableCell>
              <TableCell>Призовой фонд</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Организатор</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tournaments.map((tournament) => (
              <TableRow key={tournament.id}>
                <TableCell>{tournament.id}</TableCell>
                <TableCell>
                <Button
                  variant="text"
                  onClick={() => navigate(`/tournaments/${tournament.id}`)}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto', fontWeight: 'normal' }}
                >
                  {tournament.title}
                </Button>
              </TableCell>
                <TableCell>{tournament.game}</TableCell>
                <TableCell>{new Date(tournament.start_date).toLocaleString()}</TableCell>
                <TableCell>{tournament.prize_pool.toLocaleString()} ₽</TableCell>
                <TableCell>
                  <TournamentStatusChip status={tournament.status} />
                </TableCell>
                <TableCell>{tournament.organizer?.username || tournament.organizer_id}</TableCell>
                <TableCell>
                  {(isManager || isOrganizer) && (
                    <>
                      <IconButton size="small" onClick={() => handleOpenEdit(tournament)}>
                        <EditIcon />
                      </IconButton>
                      {isManager && tournament.status === 'pending' && (
                        <IconButton size="small" color="success" onClick={() => handleApprove(tournament.id)}>
                          <ApproveIcon />
                        </IconButton>
                      )}
                      {isManager && (
                        <IconButton size="small" color="error" onClick={() => handleDelete(tournament.id)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </>
                  )}
                </TableCell>
                
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}

      {/* Диалог создания/редактирования */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTournament ? 'Редактировать турнир' : 'Создать турнир'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
export default Tournaments;