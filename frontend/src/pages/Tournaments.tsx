import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { tournamentsApi } from '../api/tournaments';
import Grid from '@mui/material/Grid';
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
  Stack,
  Card,
  Switch,
  FormControlLabel,
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
  CloudUpload as CloudUploadIcon,
  Delete as DeleteOutlineIcon,  
} from '@mui/icons-material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
const POPULAR_GAMES = [
  'Counter-Strike 2',
  'Dota 2',
  'Valorant',
  'League of Legends',
  'Overwatch 2',
  'PUBG',
  'Fortnite',
  'Apex Legends',
  'Rainbow Six Siege',
  'Rocket League',
];

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
  
  // Форма
  const [customGame, setCustomGame] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<TournamentCreate>({
    title: '',
    game: '',
    description: '',
    start_date: '',
    registration_deadline: '',
    entry_fee: 0,
    prize_pool: 0,
    max_teams: 16,
    is_vip: false,
    banner_url: '',
  });

  const [formErrors, setFormErrors] = useState<{
    title?: string;
    game?: string;
    customGame?: string;
    start_date?: string;
    registration_deadline?: string;
    dates?: string;
    entry_fee?: string;
    prize_pool?: string;
    max_teams?: string;
  }>({});

  const loadTournaments = useCallback(async () => {
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

       filtered.sort((b, a) => b.id - a.id);
      
      setTournaments(filtered);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки турниров');
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, [filterGame, filterStatus, searchTitle]);

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
  }, [loadTournaments]);

  useEffect(() => {
    loadUniqueGames();
  }, []);

const uploadBanner = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('banner', file);
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:8080/api/upload/banner', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload failed');
    }
    
    const data = await response.json();
    return data.url;
  } catch (err) {
    console.error('Upload error:', err);
    throw err;
  }
};

  const handleBannerSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setFormErrors(prev => ({ ...prev, banner: 'Пожалуйста, выберите изображение' as any }));
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(prev => ({ ...prev, banner: 'Размер изображения не должен превышать 5MB' as any }));
      return;
    }
    
    setBannerFile(file);
    setFormErrors(prev => ({ ...prev, banner: undefined }));
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview('');
    setFormData(prev => ({ ...prev, banner_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Введите название турнира';
    }
    
    if (!formData.game) {
      errors.game = 'Выберите игру';
    } else if (formData.game === 'other' && !customGame.trim()) {
      errors.customGame = 'Введите название игры';
    }
    
    if (!formData.start_date) {
      errors.start_date = 'Укажите дату начала';
    }
    
    if (!formData.registration_deadline) {
      errors.registration_deadline = 'Укажите дедлайн регистрации';
    }
    
    if (formData.start_date && formData.registration_deadline) {
      const startDate = new Date(formData.start_date);
      const deadlineDate = new Date(formData.registration_deadline);
      const now = new Date();
      
      if (deadlineDate >= startDate) {
        errors.dates = 'Дедлайн регистрации должен быть раньше даты начала турнира';
      }
      
      if (startDate <= now) {
        errors.start_date = 'Дата начала должна быть в будущем';
      }
      
      if (deadlineDate <= now) {
        errors.registration_deadline = 'Дедлайн регистрации должен быть в будущем';
      }
    }
    
    if (formData.max_teams < 2) {
      errors.max_teams = 'Минимум 2 команды';
    }
    if (formData.max_teams > 64) {
      errors.max_teams = 'Максимум 64 команды';
    }
    
    if (formData.entry_fee < 0) errors.entry_fee = 'Взнос не может быть отрицательным';
    if (formData.prize_pool < 0) errors.prize_pool = 'Призовой фонд не может быть отрицательным';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreate = () => {
    setEditingTournament(null);
    setFormData({
      title: '',
      game: '',
      description: '',
      start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      registration_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      entry_fee: 0,
      prize_pool: 0,
      max_teams: 16,
      is_vip: false,
      banner_url: '',
    });
    setCustomGame('');
    setBannerFile(null);
    setBannerPreview('');
    setFormErrors({});
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
      is_vip: tournament.is_vip || false,
      banner_url: tournament.banner_url || '',
    });
    
    if (tournament.banner_url) {
      setBannerPreview(`http://localhost:8080${tournament.banner_url}`);
    }
    
    const isCustomGame = !POPULAR_GAMES.includes(tournament.game);
    if (isCustomGame) {
      setCustomGame(tournament.game);
      setFormData(prev => ({ ...prev, game: 'other' }));
    } else {
      setCustomGame('');
    }
    
    setFormErrors({});
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
    if (!validateForm()) return;
    
    setUploadingBanner(true);
    
    try {
      let finalGame = formData.game;
      if (formData.game === 'other') {
        finalGame = customGame;
      }
      
      let bannerUrl = formData.banner_url;
      if (bannerFile) {
        bannerUrl = await uploadBanner(bannerFile);
      }
      
      const dataToSend = {
        title: formData.title,
        game: finalGame,
        description: formData.description || '',
        start_date: new Date(formData.start_date).toISOString(),
        registration_deadline: new Date(formData.registration_deadline).toISOString(),
        entry_fee: formData.entry_fee || 0,
        prize_pool: formData.prize_pool || 0,
        max_teams: formData.max_teams,
        is_vip: formData.is_vip || false,
        banner_url: bannerUrl,
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
        if (dataToSend.is_vip !== editingTournament.is_vip) updateData.is_vip = dataToSend.is_vip;
        if (dataToSend.banner_url !== editingTournament.banner_url) updateData.banner_url = dataToSend.banner_url;
        
        if (Object.keys(updateData).length === 0) {
          setOpenDialog(false);
          setUploadingBanner(false);
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
      console.error('Submit error:', err);
      const serverMessage = err.response?.data?.message || 'Ошибка сохранения';
      if (serverMessage.includes('дедлайн') || serverMessage.includes('дата')) {
        setFormErrors(prev => ({ ...prev, dates: serverMessage }));
      } else {
        setFormErrors(prev => ({ ...prev, title: serverMessage }));
      }
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'entry_fee' || name === 'prize_pool' || name === 'max_teams'
          ? Number(value) || 0
          : value,
      }));
      if (formErrors[name as keyof typeof formErrors]) {
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
      }
    }
  };

  const exportToCSV = () => {
    if (!tournaments || tournaments.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

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
      'VIP': t.is_vip ? 'Да' : 'Нет',
      'Создан': new Date(t.created_at).toLocaleString(),
    }));

    const csv = Papa.unparse(exportData);
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
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToCSV}>
            Экспорт CSV
          </Button>
          <Button variant="outlined" startIcon={<HomeIcon />} onClick={() => navigate('/dashboard')}>
            На главную
          </Button>
          {(isManager || isOrganizer) && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
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
            <Button fullWidth variant="outlined" onClick={resetFilters}>
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
                <TableCell>VIP</TableCell>
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
                  <TableCell>{tournament.is_vip ? '⭐ VIP' : ''}</TableCell>
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

      {/* Диалог создания/редактирования турнира */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTournament ? 'Редактировать турнир' : 'Создать турнир'}
        </DialogTitle>
        <DialogContent>
          {formErrors.dates && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {formErrors.dates}
            </Alert>
          )}

          {/* Баннер турнира */}
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Баннер турнира
            </Typography>
            
            {bannerPreview ? (
              <Card sx={{ mb: 2, position: 'relative' }}>
                <Box
                  component="img"
                  src={bannerPreview}
                  alt="Баннер турнира"
                  sx={{ height: 150, width: '100%', objectFit: 'cover' }}
                />
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)' }}
                  onClick={handleRemoveBanner}
                >
                  <DeleteOutlineIcon sx={{ color: 'white' }} />
                </IconButton>
              </Card>
            ) : (
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                sx={{ width: '100%', py: 4, borderStyle: 'dashed' }}
              >
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleBannerSelect}
                  ref={fileInputRef}
                />
                <Stack direction="column" alignItems="center">
                  <CloudUploadIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body2">Нажмите для загрузки баннера</Typography>
                  <Typography variant="caption" color="text.secondary">
                    PNG, JPG, GIF до 5MB
                  </Typography>
                </Stack>
              </Button>
            )}
          </Box>

          <TextField
            fullWidth
            label="Название турнира"
            name="title"
            value={formData.title}
            onChange={handleChange}
            margin="normal"
            required
            error={!!formErrors.title}
            helperText={formErrors.title}
          />

          <FormControl fullWidth margin="normal" required error={!!formErrors.game}>
            <InputLabel>Игра</InputLabel>
            <Select
              name="game"
              value={formData.game}
              onChange={(e) => {
                handleChange(e as any);
                if (e.target.value !== 'other') {
                  setCustomGame('');
                }
              }}
              label="Игра"
            >
              {POPULAR_GAMES.map((game) => (
                <MenuItem key={game} value={game}>{game}</MenuItem>
              ))}
              <MenuItem value="other">📝 Другое (ввести вручную)</MenuItem>
            </Select>
            {formErrors.game && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                {formErrors.game}
              </Typography>
            )}
          </FormControl>

          {formData.game === 'other' && (
            <TextField
              fullWidth
              label="Название игры"
              value={customGame}
              onChange={(e) => {
                setCustomGame(e.target.value);
                setFormErrors(prev => ({ ...prev, customGame: undefined }));
              }}
              margin="normal"
              required
              error={!!formErrors.customGame}
              helperText={formErrors.customGame || "Например: Apex Legends, Rocket League и т.д."}
              placeholder="Введите название игры"
            />
          )}

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
            error={!!formErrors.start_date}
            helperText={formErrors.start_date}
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
            error={!!formErrors.registration_deadline}
            helperText={formErrors.registration_deadline}
            InputLabelProps={{ shrink: true }}
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
            error={!!formErrors.max_teams}
            helperText={formErrors.max_teams}
          />

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Финансовые параметры</Typography>
          
          <TextField
            fullWidth
            label="Вступительный взнос (₽)"
            name="entry_fee"
            type="number"
            value={formData.entry_fee || ''}
            onChange={handleChange}
            margin="normal"
            placeholder="0"
            error={!!formErrors.entry_fee}
            helperText={formErrors.entry_fee || "Сколько должна заплатить каждая команда"}
            inputProps={{ min: 0 }}
          />

          <TextField
            fullWidth
            label="Призовой фонд (₽)"
            name="prize_pool"
            type="number"
            value={formData.prize_pool || ''}
            onChange={handleChange}
            margin="normal"
            placeholder="0"
            error={!!formErrors.prize_pool}
            helperText={formErrors.prize_pool || "Общая сумма призовых"}
            inputProps={{ min: 0 }}
          />
          <FormControlLabel
  control={
    <Switch
      checked={formData.is_vip || false}
      onChange={(e) => setFormData(prev => ({ ...prev, is_vip: e.target.checked }))}
      color="warning"
    />
  }
  label={
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <EmojiEventsIcon sx={{ color: 'gold' }} />
      <Typography variant="subtitle1">VIP статус турнира</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
        VIP турниры получают повышенную видимость
      </Typography>
    </Box>
  }
/>
        </DialogContent>

        
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={uploadingBanner}
          >
            {uploadingBanner ? 'Загрузка...' : (editingTournament ? 'Сохранить' : 'Создать')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Tournaments;