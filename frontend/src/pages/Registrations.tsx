import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  TablePagination,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Home as HomeIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import Papa from 'papaparse';
import { useAuth } from '../contexts/AuthContext';
import { registrationsApi } from '../api/registrations';
import { tournamentsApi } from '../api/tournaments';
import { clientApi, TournamentApplication } from '../api/clientApi';
import { Tournament } from '../types';

const RegistrationStatusChip: React.FC<{ status: string }> = ({ status }) => {
  const statusMap: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'default' }> = {
    pending: { label: 'Ожидает', color: 'warning' },
    approved: { label: 'Одобрена', color: 'success' },
    rejected: { label: 'Отклонена', color: 'error' },
  };
  const { label, color } = statusMap[status] || { label: status, color: 'default' as const };
  return <Chip label={label} color={color} size="small" />;
};

const PaymentStatusChip: React.FC<{ status: string }> = ({ status }) => {
  const statusMap: Record<string, { label: string; color: 'warning' | 'success' | 'default' }> = {
    pending: { label: 'Ожидает оплаты', color: 'warning' },
    paid: { label: 'Оплачено', color: 'success' },
    refunded: { label: 'Возвращено', color: 'default' },
  };
  const { label, color } = statusMap[status] || { label: status, color: 'default' as const };
  return <Chip label={label} color={color} size="small" variant="outlined" />;
};

const Registrations: React.FC = () => {
  const { isManager, isOrganizer } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [applications, setApplications] = useState<TournamentApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const response = await tournamentsApi.getAll();
        setTournaments(response.data || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки турниров';
        setError(msg);
      }
    };
    loadTournaments();
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const tournamentId =
        selectedTournamentId === '' ? undefined : Number(selectedTournamentId);
      const list = await clientApi.getRegistrationApplications(filterStatus, tournamentId);
      setApplications(list);
      setError('');
      setPage(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки заявок';
      setError(msg);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, selectedTournamentId]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleApprove = async (id: number) => {
    try {
      await registrationsApi.approve(id);
      await loadApplications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка подтверждения заявки';
      setError(msg);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await registrationsApi.reject(id);
      await loadApplications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка отклонения заявки';
      setError(msg);
    }
  };

  const exportToCSV = () => {
    if (!applications.length) {
      alert('Нет данных для экспорта');
      return;
    }

    const exportData = applications.map((reg) => ({
      ID: reg.id,
      Турнир: reg.tournament_title,
      Команда: reg.team_name,
      Игрок: reg.username || reg.user_id,
      Email: reg.email,
      Организатор: reg.organizer_username,
      'Статус заявки':
        reg.status === 'pending' ? 'Ожидает' : reg.status === 'approved' ? 'Одобрена' : 'Отклонена',
      'Статус оплаты':
        reg.payment_status === 'pending'
          ? 'Ожидает оплаты'
          : reg.payment_status === 'paid'
            ? 'Оплачено'
            : 'Возвращено',
      'Дата регистрации': new Date(reg.registered_at).toLocaleString(),
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute(
      'download',
      `заявки_${selectedTournamentId || 'все'}_${new Date().toISOString().slice(0, 19)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const paginated = applications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Заявки от участников</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {applications.length > 0 && (
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToCSV}>
                Экспорт CSV
              </Button>
            )}
            <Button variant="outlined" startIcon={<HomeIcon />} onClick={() => navigate('/dashboard')}>
              На главную
            </Button>
          </Box>
        </Box>

        {isManager && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Здесь отображаются все заявки игроков и команд, в том числе поданные лидером команды. Фильтр по
            турниру необязателен.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Турнир (фильтр)</InputLabel>
              <Select
                value={selectedTournamentId === '' ? '' : String(selectedTournamentId)}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedTournamentId(v === '' ? '' : Number(v));
                }}
                label="Турнир (фильтр)"
              >
                <MenuItem value="">Все турниры</MenuItem>
                {tournaments.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.title} ({t.game}) — {new Date(t.start_date).toLocaleDateString()}
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
        </Grid>

        {loading ? (
          <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : applications.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Нет заявок по выбранным фильтрам</Typography>
          </Paper>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Турнир</TableCell>
                    {isManager && <TableCell>Организатор</TableCell>}
                    <TableCell>Команда</TableCell>
                    <TableCell>Игрок (лидер)</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Оплата</TableCell>
                    <TableCell>Дата</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>{reg.id}</TableCell>
                      <TableCell>{reg.tournament_title}</TableCell>
                      {isManager && <TableCell>{reg.organizer_username}</TableCell>}
                      <TableCell>{reg.team_name}</TableCell>
                      <TableCell>{reg.username}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell>
                        <RegistrationStatusChip status={reg.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentStatusChip status={reg.payment_status} />
                      </TableCell>
                      <TableCell>{new Date(reg.registered_at).toLocaleString('ru-RU')}</TableCell>
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
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={applications.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Записей на странице:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
            />
          </>
        )}
      </Box>
    </Container>
  );
};

export default Registrations;
