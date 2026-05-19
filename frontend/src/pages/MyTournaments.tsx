import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
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
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Tooltip,
  Divider,
  Card,
  CardContent,
  CardActions,
  Stack,
  CardActionArea,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon,
  ArrowBack as ArrowBackIcon,
  Diamond as DiamondIcon,
  AttachMoney as AttachMoneyIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIconOutline,
  Image as ImageIcon,
  CalendarToday as CalendarIcon,
  Groups as GroupsIcon,
  SportsEsports as GameIcon,
  Paid as PaidIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { tournamentsApi } from '../api/tournaments';
import { Tournament, TournamentCreate, UserSubscription } from '../types';
import NavBar from '../components/NavBar';

const MyTournaments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [customGame, setCustomGame] = useState('');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isPaidTournament, setIsPaidTournament] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    game?: string;
    customGame?: string;
    start_date?: string;
    registration_deadline?: string;
    dates?: string;
    entry_fee?: string;
    prize_pool?: string;
    banner?: string;
  }>({});
  
  const [formData, setFormData] = useState<TournamentCreate>({
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

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/subscriptions/my', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const subscription: UserSubscription = await response.json();
        setHasSubscription(subscription.is_active === true);
      } else {
        setHasSubscription(false);
      }
    } catch (err) {
      console.error('Ошибка проверки подписки:', err);
      setHasSubscription(false);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'organizer' && user?.role !== 'manager') {
      navigate('/client/tournaments');
      return;
    }
    loadMyTournaments();
  }, [user, navigate]);

  const loadMyTournaments = async () => {
    try {
      setLoading(true);
      const response = await tournamentsApi.getAll();
      const allTournaments = response.data || [];
      const myTourns = allTournaments.filter(t => t.organizer_id === user?.id);
      setTournaments(myTourns);
      setPageError('');
    } catch (err: any) {
      setPageError(err.response?.data?.message || 'Ошибка загрузки турниров');
    } finally {
      setLoading(false);
    }
  };

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
        const errorText = await response.text();
        throw new Error(errorText);
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
      setFormErrors(prev => ({ ...prev, banner: 'Пожалуйста, выберите изображение' }));
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(prev => ({ ...prev, banner: 'Размер изображения не должен превышать 5MB' }));
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
    setIsPaidTournament(false);
    setBannerFile(null);
    setBannerPreview('');
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleOpenEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
    const isPaid = tournament.entry_fee > 0 || tournament.prize_pool > 0;
    setIsPaidTournament(isPaid);
    
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
    
    const predefinedGames = ['CS2', 'Dota 2', 'Valorant', 'League of Legends', 'Overwatch 2', 'PUBG', 'Fortnite'];
    if (!predefinedGames.includes(tournament.game)) {
      setCustomGame(tournament.game);
      setFormData(prev => ({ ...prev, game: 'other' }));
    } else {
      setCustomGame('');
    }
    
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить турнир? Это действие нельзя отменить.')) return;
    try {
      await tournamentsApi.delete(id);
      loadMyTournaments();
    } catch (err: any) {
      setPageError(err.response?.data?.message || 'Ошибка удаления');
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Введите название турнира';
    } else if (formData.title.length < 3) {
      errors.title = 'Название должно содержать минимум 3 символа';
    } else if (formData.title.length > 100) {
      errors.title = 'Название не должно превышать 100 символов';
    }
    
    if (!formData.game) {
      errors.game = 'Выберите игру';
    } else if (formData.game === 'other' && !customGame.trim()) {
      errors.customGame = 'Введите название игры';
    } else if (formData.game === 'other' && customGame.length > 50) {
      errors.customGame = 'Название игры не должно превышать 50 символов';
    }
    
    if (!formData.start_date) {
      errors.start_date = 'Укажите дату начала турнира';
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
      errors.title = 'Минимум 2 команды';
    }
    if (formData.max_teams > 64) {
      errors.title = 'Максимум 64 команды';
    }
    
    if (isPaidTournament) {
      if (formData.entry_fee < 0) {
        errors.entry_fee = 'Вступительный взнос не может быть отрицательным';
      }
      if (formData.prize_pool < 0) {
        errors.prize_pool = 'Призовой фонд не может быть отрицательным';
      }
      if (formData.entry_fee === 0 && formData.prize_pool === 0) {
        errors.entry_fee = 'Укажите вступительный взнос или призовой фонд';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setUploadingBanner(true);
    
    try {
      let startDate: Date | null = null;
      let deadlineDate: Date | null = null;
      let startDateISO = '';
      let deadlineISO = '';
      
      if (formData.start_date) {
        startDate = new Date(formData.start_date);
        startDateISO = startDate.toISOString();
      }
      
      if (formData.registration_deadline) {
        deadlineDate = new Date(formData.registration_deadline);
        deadlineISO = deadlineDate.toISOString();
      }
      
      let finalGame = formData.game;
      if (formData.game === 'other') {
        finalGame = customGame;
      }
      
      const entryFee = isPaidTournament ? formData.entry_fee : 0;
      const prizePool = isPaidTournament ? formData.prize_pool : 0;
      
      let bannerUrl = formData.banner_url;
      if (bannerFile) {
        bannerUrl = await uploadBanner(bannerFile);
      }
      
      const dataToSend = {
        title: formData.title,
        game: finalGame,
        description: formData.description || '',
        start_date: startDateISO,
        registration_deadline: deadlineISO,
        entry_fee: Number(entryFee) || 0,
        prize_pool: Number(prizePool) || 0,
        max_teams: Number(formData.max_teams) || 16,
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
      loadMyTournaments();
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
          ? Number(value)
          : value,
      }));
      if (formErrors[name as keyof typeof formErrors]) {
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
      }
    }
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      is_vip: e.target.checked,
    }));
  };

  const handlePaidTournamentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPaidTournament(e.target.checked);
    if (!e.target.checked) {
      setFormData(prev => ({
        ...prev,
        entry_fee: 0,
        prize_pool: 0,
      }));
      setFormErrors(prev => ({
        ...prev,
        entry_fee: undefined,
        prize_pool: undefined,
      }));
    }
  };

  const handleBack = () => {
    navigate('/client/tournaments');
  };

  const getStatusChip = (status: string) => {
    const statusMap: Record<string, { label: string; color: any }> = {
      pending: { label: 'Ожидает', color: 'warning' },
      approved: { label: 'Одобрен', color: 'success' },
      ongoing: { label: 'Идёт', color: 'info' },
      completed: { label: 'Завершён', color: 'default' },
      cancelled: { label: 'Отменён', color: 'error' },
    };
    const { label, color } = statusMap[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: '#ff9800',
      approved: '#4caf50',
      ongoing: '#2196f3',
      completed: '#9e9e9e',
      cancelled: '#f44336',
    };
    return colorMap[status] || '#9e9e9e';
  };

  // Функция для получения полного URL баннера
  const getBannerUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `http://localhost:8080${url}`;
  };

  return (
    <>
      <NavBar />

      <Container maxWidth="xl">
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Назад к турнирам
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              Создать турнир
            </Button>
          </Box>

          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
            Мои турниры
            <Chip 
              label={`${tournaments.length} турниров`} 
              size="small" 
              sx={{ ml: 2, verticalAlign: 'middle' }}
            />
          </Typography>

          {pageError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError('')}>
              {pageError}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" sx={{ mt: 8 }}>
              <CircularProgress />
            </Box>
          ) : tournaments.length === 0 ? (
            <Paper sx={{ p: 8, textAlign: 'center' }}>
              <EmojiEventsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>
                У вас пока нет турниров
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Создайте свой первый турнир и начните управлять им!
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={handleOpenCreate}
                size="large"
              >
                Создать турнир
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {tournaments.map((tournament) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={tournament.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: (theme) => theme.shadows[8],
                      },
                      position: 'relative',
                      overflow: 'visible',
                    }}
                  >
                    {/* VIP бейдж */}
                    {tournament.is_vip && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -10,
                          right: -10,
                          zIndex: 1,
                        }}
                      >
                        <Tooltip title="VIP Турнир">
                          <DiamondIcon sx={{ color: 'gold', fontSize: 40 }} />
                        </Tooltip>
                      </Box>
                    )}
                    
                    {/* Баннер или заглушка */}
                    <CardActionArea onClick={() => navigate(`/tournaments/${tournament.id}`)}>
                      {tournament.banner_url ? (
                        <Box
                          sx={{
                            height: 160,
                            backgroundColor: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={getBannerUrl(tournament.banner_url)}
                            alt={tournament.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              console.error('Failed to load banner:', tournament.banner_url);
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.style.background = `linear-gradient(135deg, ${getStatusColor(tournament.status)} 0%, ${alpha(getStatusColor(tournament.status), 0.7)} 100%)`;
                                parent.style.display = 'flex';
                                parent.style.alignItems = 'center';
                                parent.style.justifyContent = 'center';
                              }
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            height: 160,
                            background: `linear-gradient(135deg, ${getStatusColor(tournament.status)} 0%, ${alpha(getStatusColor(tournament.status), 0.7)} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <EmojiEventsIcon sx={{ fontSize: 64, color: 'white', opacity: 0.8 }} />
                        </Box>
                      )}
                      
                      {/* Статус на баннере */}
                      <Chip
                        label={getStatusChip(tournament.status).props.label}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 16,
                          right: 16,
                          backgroundColor: getStatusColor(tournament.status),
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                    </CardActionArea>
                    
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, minHeight: 64 }}>
                        {tournament.title}
                      </Typography>
                      
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <GameIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {tournament.game}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={1}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {new Date(tournament.start_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={1}>
                          <GroupsIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {tournament.max_teams} команд
                          </Typography>
                        </Box>
                        
                        {(tournament.entry_fee > 0 || tournament.prize_pool > 0) && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <PaidIcon fontSize="small" color="success" />
                            <Typography variant="body2" color="success.main">
                              {tournament.entry_fee > 0 && `${tournament.entry_fee} ₽ взнос`}
                              {tournament.entry_fee > 0 && tournament.prize_pool > 0 && ' • '}
                              {tournament.prize_pool > 0 && `${tournament.prize_pool.toLocaleString()} ₽ приз`}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                    
                    <Divider />
                    
                    <CardActions sx={{ p: 2, justifyContent: 'space-between' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(`/tournaments/${tournament.id}`)}
                      >
                        Подробнее
                      </Button>
                      <Box>
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
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>

      {/* Диалог создания/редактирования турнира */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {editingTournament ? 'Редактировать турнир' : 'Создать турнир'}
            {hasSubscription && !subscriptionLoading && (
              <Chip 
                icon={<DiamondIcon />} 
                label="VIP доступен" 
                color="warning" 
                size="small" 
              />
            )}
          </Box>
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
                  <DeleteIconOutline sx={{ color: 'white' }} />
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
                  <Typography variant="body2">
                    Нажмите для загрузки баннера
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PNG, JPG, GIF до 5MB
                  </Typography>
                </Stack>
              </Button>
            )}
            {formErrors.banner && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                {formErrors.banner}
              </Typography>
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
                  setFormErrors(prev => ({ ...prev, game: undefined, customGame: undefined }));
                }
              }}
              label="Игра"
            >
              <MenuItem value="CS2">Counter-Strike 2</MenuItem>
              <MenuItem value="Dota 2">Dota 2</MenuItem>
              <MenuItem value="Valorant">Valorant</MenuItem>
              <MenuItem value="League of Legends">League of Legends</MenuItem>
              <MenuItem value="Overwatch 2">Overwatch 2</MenuItem>
              <MenuItem value="PUBG">PUBG</MenuItem>
              <MenuItem value="Fortnite">Fortnite</MenuItem>
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
          />

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isPaidTournament}
                  onChange={handlePaidTournamentChange}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon color="primary" />
                    Платный турнир
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Включите, если нужен вступительный взнос или призовой фонд
                  </Typography>
                </Box>
              }
            />
          </Box>

          {isPaidTournament && (
            <Box sx={{ pl: 2, borderLeft: 3, borderColor: 'primary.main', mb: 2 }}>
              <TextField
                fullWidth
                label="Вступительный взнос (₽)"
                name="entry_fee"
                type="number"
                value={formData.entry_fee}
                onChange={handleChange}
                margin="normal"
                error={!!formErrors.entry_fee}
                helperText={formErrors.entry_fee || "Сколько должна заплатить каждая команда"}
                inputProps={{ min: 0 }}
              />
              
              <TextField
                fullWidth
                label="Призовой фонд (₽)"
                name="prize_pool"
                type="number"
                value={formData.prize_pool}
                onChange={handleChange}
                margin="normal"
                error={!!formErrors.prize_pool}
                helperText={formErrors.prize_pool || "Общая сумма призовых"}
                inputProps={{ min: 0 }}
              />
            </Box>
          )}

          {hasSubscription && !subscriptionLoading && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255, 215, 0, 0.1)', borderRadius: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_vip || false}
                    onChange={handleSwitchChange}
                    color="warning"
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DiamondIcon sx={{ color: 'gold' }} />
                      VIP статус турнира
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      VIP турниры получают повышенную видимость и приоритетную модерацию
                    </Typography>
                  </Box>
                }
              />
            </Box>
          )}
          
          {!hasSubscription && !subscriptionLoading && user?.role === 'organizer' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Оформите подписку, чтобы получать VIP статус для ваших турниров!
              </Typography>
              <Button 
                size="small" 
                onClick={() => navigate('/subscription')}
                sx={{ mt: 1 }}
              >
                Оформить подписку
              </Button>
            </Alert>
          )}
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
    </>
  );
};

export default MyTournaments;