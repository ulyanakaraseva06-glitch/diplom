import Grid from '@mui/material/Grid';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { bansApi } from '../api/bans';
import { Ban, BanRequest } from '../types';
import Papa from 'papaparse';
import DownloadIcon from '@mui/icons-material/Download';
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
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

const Bans: React.FC = () => {
  const { isManager } = useAuth();
  const navigate = useNavigate();
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<BanRequest>({
    user_id: 0,
    reason: '',
    expires_at: '',
  });
const exportToCSV = () => {
  if (!bans || bans.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  const exportData = bans.map(ban => ({
    'ID': ban.id,
    'Пользователь': ban.username || ban.user_id,
    'Модератор': ban.moderator_name || ban.moderator_id,
    'Причина': ban.reason,
    'Дата блокировки': new Date(ban.banned_at).toLocaleString(),
    'Действует до': ban.expires_at ? new Date(ban.expires_at).toLocaleString() : 'Бессрочно',
    'Активна': ban.is_active ? 'Да' : 'Нет',
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `блокировки_${new Date().toISOString().slice(0, 19)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
  const loadBans = async () => {
    try {
      setLoading(true);
      const response = await bansApi.getAll();
      setBans(response.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки блокировок');
      setBans([]);
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    loadBans();
  }, []);

  const handleRemoveBan = async (userId: number) => {
    if (!window.confirm('Разблокировать пользователя?')) return;
    try {
      await bansApi.remove(userId);
      loadBans();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка разблокировки');
    }
  };

const handleCreateBan = async () => {
  if (!formData.user_id || !formData.reason) {
    setError('Укажите ID пользователя и причину блокировки');
    return;
  }
  
  // Формируем тело запроса
  const body: { user_id: number; reason: string; expires_at?: string } = {
    user_id: formData.user_id,
    reason: formData.reason,
  };
  
  
  // Добавляем expires_at только если есть значение, и форматируем его
  if (formData.expires_at && formData.expires_at.trim() !== '') {
    // Преобразуем "2026-05-02T01:46" в "2026-05-02T01:46:00Z"
    body.expires_at = formData.expires_at + ':00Z';
  }
  
  console.log('Отправляемые данные:', body);
  
  try {
    await bansApi.create(body);
    setOpenDialog(false);
    setFormData({ user_id: 0, reason: '', expires_at: '' });
    loadBans();
  } catch (err: any) {
    console.error('Ошибка:', err.response?.data);
    setError(err.response?.data?.message || 'Ошибка создания блокировки');
  }
};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'user_id' ? Number(value) : value,
    }));
  };

  if (!isManager) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">Доступ запрещен. Только для менеджеров.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
  <Typography variant="h4">Блокировки пользователей</Typography>
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
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => setOpenDialog(true)}
    >
      Заблокировать
    </Button>
  </Box>
</Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : !bans || bans.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Нет активных блокировок</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Пользователь</TableCell>
                  <TableCell>Модератор</TableCell>
                  <TableCell>Причина</TableCell>
                  <TableCell>Дата блокировки</TableCell>
                  <TableCell>Действует до</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bans.map((ban) => (
                  <TableRow key={ban.id}>
                    <TableCell>{ban.id}</TableCell>
                    <TableCell>{ban.username || ban.user_id}</TableCell>
                    <TableCell>{ban.moderator_name || ban.moderator_id}</TableCell>
                    <TableCell>{ban.reason}</TableCell>
                    <TableCell>{new Date(ban.banned_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {ban.expires_at 
                        ? new Date(ban.expires_at).toLocaleString()
                        : 'Бессрочно'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveBan(ban.user_id)}
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

      {/* Диалог создания блокировки */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Заблокировать пользователя</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="ID пользователя"
            name="user_id"
            type="number"
            value={formData.user_id || ''}
            onChange={handleChange}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Причина блокировки"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
            required
          />
          <TextField
            fullWidth
            label="Действует до (необязательно)"
            name="expires_at"
            type="datetime-local"
            value={formData.expires_at}
            onChange={handleChange}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleCreateBan}>
            Заблокировать
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Bans;