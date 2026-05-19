import React, { useEffect, useState } from 'react';
import {
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { clientApi, TournamentApplication } from '../api/clientApi';
import { registrationsApi } from '../api/registrations';

interface Props {
  title?: string;
  showOrganizerColumn?: boolean;
  defaultStatus?: string;
}

const TournamentApplicationsPanel: React.FC<Props> = ({
  title = 'Модерация заявок на участие',
  showOrganizerColumn = false,
  defaultStatus = 'pending',
}) => {
  const [apps, setApps] = useState<TournamentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(defaultStatus);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await clientApi.getRegistrationApplications(status);
      setApps(list);
    } catch {
      setError('Ошибка загрузки заявок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const handleApprove = async (id: number) => {
    try {
      await registrationsApi.approve(id);
      load();
    } catch {
      alert('Ошибка подтверждения');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await registrationsApi.reject(id);
      load();
    } catch {
      alert('Ошибка отклонения');
    }
  };

  const statusLabel: Record<string, string> = {
    pending: 'Ожидает',
    approved: 'Одобрена',
    rejected: 'Отклонена',
  };

  const colSpan = showOrganizerColumn ? 8 : 7;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>

      <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
        <InputLabel>Статус заявки</InputLabel>
        <Select value={status} label="Статус заявки" onChange={(e) => setStatus(e.target.value)}>
          <MenuItem value="">Все статусы</MenuItem>
          <MenuItem value="pending">Ожидают</MenuItem>
          <MenuItem value="approved">Одобрены</MenuItem>
          <MenuItem value="rejected">Отклонены</MenuItem>
        </Select>
      </FormControl>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Турнир</TableCell>
                {showOrganizerColumn && <TableCell>Организатор</TableCell>}
                <TableCell>Команда</TableCell>
                <TableCell>Игрок</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Дата</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apps.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.tournament_title}</TableCell>
                  {showOrganizerColumn && <TableCell>{a.organizer_username}</TableCell>}
                  <TableCell>{a.team_name}</TableCell>
                  <TableCell>{a.username}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>
                    <Chip label={statusLabel[a.status] || a.status} size="small" />
                  </TableCell>
                  <TableCell>{new Date(a.registered_at).toLocaleString('ru-RU')}</TableCell>
                  <TableCell align="right">
                    {a.status === 'pending' && (
                      <>
                        <Button size="small" color="success" onClick={() => handleApprove(a.id)} sx={{ mr: 0.5 }}>
                          Одобрить
                        </Button>
                        <Button size="small" color="error" onClick={() => handleReject(a.id)}>
                          Отклонить
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {apps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colSpan} align="center">
                    Нет заявок
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default TournamentApplicationsPanel;
