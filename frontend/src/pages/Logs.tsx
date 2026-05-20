import React, { useState, useEffect } from 'react';
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
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';

interface LogEntry {
  id: number;
  manager_id: number;
  manager_name?: string;
  action: string;
  entity_type: string;
  entity_id: number;
  old_data: string;
  new_data: string;
  created_at: string;
}

const Logs: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/admin/logs');
        setLogs(response.data.logs || []);
        setTotal(response.data.total || 0);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Ошибка загрузки логов');
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'DELETE': return 'error';
      case 'BAN': return 'warning';
      case 'APPROVE': return 'success';
      default: return 'default';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'DELETE': return 'Удаление';
      case 'BAN': return 'Блокировка';
      case 'APPROVE': return 'Подтверждение';
      default: return action;
    }
  };

  const getEntityLabel = (entity: string) => {
    switch (entity) {
      case 'tournament': return 'Турнир';
      case 'user': return 'Пользователь';
      case 'registration': return 'Заявка';
      default: return entity;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    // Формат: 2026-05-20 07:10:26.732469
    const parts = dateStr.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1].substring(0, 8)}`;
    }
    return dateStr;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
              Назад
            </Button>
            <Typography variant="h4">Логи действий</Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/dashboard')}
          >
            На главную
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Всего записей: {total}
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
        ) : logs.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Нет записей в логах</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Действие</TableCell>
                  <TableCell>Сущность</TableCell>
                  <TableCell>ID сущности</TableCell>
                  <TableCell>Старые данные</TableCell>
                  <TableCell>Новые данные</TableCell>
                  <TableCell>Дата</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.id}</TableCell>
                    <TableCell>
                      <Chip
                        label={getActionLabel(log.action)}
                        color={getActionColor(log.action) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{getEntityLabel(log.entity_type)}</TableCell>
                    <TableCell>{log.entity_id}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'auto' }}>
                      {log.old_data || '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'auto' }}>
                      {log.new_data || '—'}
                    </TableCell>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
};

export default Logs;