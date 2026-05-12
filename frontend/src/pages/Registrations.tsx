import Grid from '@mui/material/Grid';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { registrationsApi } from '../api/registrations';
import { useNavigate } from 'react-router-dom';
import { tournamentsApi } from '../api/tournaments';
import { Registration, Tournament } from '../types';
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
  Chip,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

const RegistrationStatusChip: React.FC<{ status: Registration['status'] }> = ({ status }) => {
  const statusMap = {
    pending: { label: 'Ожидает', color: 'warning' as const },
    approved: { label: 'Одобрена', color: 'success' as const },
    rejected: { label: 'Отклонена', color: 'error' as const },
  };
  const { label, color } = statusMap[status];
  return <Chip label={label} color={color} size="small" />;
};

const PaymentStatusChip: React.FC<{ status: Registration['payment_status'] }> = ({ status }) => {
  const statusMap = {
    pending: { label: 'Ожидает оплаты', color: 'warning' as const },
    paid: { label: 'Оплачено', color: 'success' as const },
    refunded: { label: 'Возвращено', color: 'default' as const },
  };
  const { label, color } = statusMap[status];
  return <Chip label={label} color={color} size="small" variant="outlined" />;
};

const Registrations: React.FC = () => {
  const { isManager, isOrganizer } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Загрузка списка турниров
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const response = await tournamentsApi.getAll();
        setTournaments(response.data || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Ошибка загрузки турниров');
      }
    };
    loadTournaments();
  }, []);

  // Загрузка заявок при выборе турнира или изменении фильтра
  useEffect(() => {
    if (!selectedTournamentId) {
      setRegistrations([]);
      return;
    }
    
    const loadRegistrations = async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (filterStatus) params.status = filterStatus;
        const response = await registrationsApi.getByTournament(selectedTournamentId, params);
        setRegistrations(response.data || []);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Ошибка загрузки заявок');
        setRegistrations([]);
      } finally {
        setLoading(false);
      }
    };
    loadRegistrations();
  }, [selectedTournamentId, filterStatus]);

  const handleApprove = async (id: number) => {
    try {
      await registrationsApi.approve(id);
      if (selectedTournamentId) {
        const params: any = {};
        if (filterStatus) params.status = filterStatus;
        const response = await registrationsApi.getByTournament(selectedTournamentId, params);
        setRegistrations(response.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка подтверждения заявки');
    }
  };
// Добавь функцию экспорта
const exportToCSV = () => {
  if (!registrations || registrations.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  const exportData = registrations.map(reg => ({
    'ID': reg.id,
    'Турнир': tournaments.find(t => t.id === selectedTournamentId)?.title || '',
    'Команда': reg.team_name,
    'Игрок': reg.username || reg.user_id,
    'Email': reg.email,
    'Статус заявки': reg.status === 'pending' ? 'Ожидает' : 
                     reg.status === 'approved' ? 'Одобрена' : 'Отклонена',
    'Статус оплаты': reg.payment_status === 'pending' ? 'Ожидает оплаты' :
                     reg.payment_status === 'paid' ? 'Оплачено' : 'Возвращено',
    'Дата регистрации': new Date(reg.registered_at).toLocaleString(),
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `заявки_турнир_${selectedTournamentId}_${new Date().toISOString().slice(0, 19)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
  const handleReject = async (id: number) => {
    try {
      await registrationsApi.reject(id);
      if (selectedTournamentId) {
        const params: any = {};
        if (filterStatus) params.status = filterStatus;
        const response = await registrationsApi.getByTournament(selectedTournamentId, params);
        setRegistrations(response.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка отклонения заявки');
    }
  };

  if (!isManager && !isOrganizer) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">Доступ запрещен. Только для менеджеров и организаторов.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
  <Typography variant="h4">Модерация заявок на турниры</Typography>
  <Box>
    {selectedTournamentId && registrations.length > 0 && (
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={exportToCSV}
        sx={{ mr: 2 }}
      >
        Экспорт CSV
      </Button>
    )}
    <Button
      variant="outlined"
      startIcon={<HomeIcon />}
      onClick={() => navigate('/dashboard')}
    >
      На главную
    </Button>
  </Box>
</Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Выберите турнир</InputLabel>
              <Select
                value={selectedTournamentId || ''}
                onChange={(e) => setSelectedTournamentId(Number(e.target.value) || null)}
                label="Выберите турнир"
              >
                <MenuItem value="">-- Выберите турнир --</MenuItem>
                {tournaments && tournaments.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.title} ({t.game}) - {new Date(t.start_date).toLocaleDateString()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Статус заявки</InputLabel>
              <Select
                value={filterStatus}
                label="Статус заявки"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">Все статусы</MenuItem>
                <MenuItem value="pending">Ожидает</MenuItem>
                <MenuItem value="approved">Одобрена</MenuItem>
                <MenuItem value="rejected">Отклонена</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 12 }}>
            <Button
              variant="outlined"
              onClick={() => setFilterStatus('')}
            >
              Сбросить фильтр
            </Button>
          </Grid>
        </Grid>

        {selectedTournamentId && (
          <>
            {loading ? (
              <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : !registrations || registrations.length === 0 ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">Нет заявок на этот турнир</Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Команда</TableCell>
                      <TableCell>Игрок</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Статус заявки</TableCell>
                      <TableCell>Оплата</TableCell>
                      <TableCell>Дата регистрации</TableCell>
                      <TableCell>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell>{reg.id}</TableCell>
                        <TableCell>{reg.team_name}</TableCell>
                        <TableCell>{reg.username || reg.user_id}</TableCell>
                        <TableCell>{reg.email}</TableCell>
                        <TableCell>
                          <RegistrationStatusChip status={reg.status} />
                        </TableCell>
                        <TableCell>
                          <PaymentStatusChip status={reg.payment_status} />
                        </TableCell>
                        <TableCell>{new Date(reg.registered_at).toLocaleString()}</TableCell>
                        <TableCell>
                          {reg.status === 'pending' && (
                            <>
                              <Button
                                size="small"
                                color="success"
                                startIcon={<ApproveIcon />}
                                onClick={() => handleApprove(reg.id)}
                                sx={{ mr: 1 }}
                              >
                                Одобрить
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<RejectIcon />}
                                onClick={() => handleReject(reg.id)}
                              >
                                Отклонить
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

export default Registrations;