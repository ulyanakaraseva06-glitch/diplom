import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useAuth } from '../contexts/AuthContext';
import { clientApi, WalletDepositAdminItem } from '../api/clientApi';

const WalletPayments: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [list, setList] = useState<WalletDepositAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await clientApi.listWalletDepositsAdmin();
      setList(data);
    } catch {
      setError('Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    setMsg('');
    try {
      await clientApi.approveWalletDepositAdmin(id);
      setMsg('Пополнение подтверждено');
      load();
    } catch {
      setError('Ошибка подтверждения');
    } finally {
      setBusyId('');
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    setMsg('');
    try {
      await clientApi.rejectWalletDepositAdmin(id);
      setMsg('Заявка отклонена, пользователь получит уведомление');
      load();
    } catch {
      setError('Ошибка отклонения');
    } finally {
      setBusyId('');
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ru-RU');
    } catch {
      return iso;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'review':
        return 'На проверке';
      case 'pending':
        return 'Ожидает «Я оплатил»';
      case 'paid':
        return 'Зачислено';
      case 'rejected':
        return 'Отклонено';
      default:
        return status;
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Заявки на пополнение
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username}
          </Typography>
          <IconButton color="inherit" onClick={() => navigate('/dashboard')}>
            <HomeIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => { logout(); navigate('/login'); }}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AccountBalanceWalletIcon color="primary" />
          <Typography variant="h5">Ожидают подтверждения</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : list.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" gutterBottom>
              Нет заявок на проверке
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Заявка появится после того, как пользователь нажмёт «Я оплатил» в окне оплаты (не только «Оплатить»).
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Пользователь</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Сумма</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Дата</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.username || `#${row.user_id}`}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.amount.toFixed(0)} ₽</TableCell>
                    <TableCell>{statusLabel(row.status)}</TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell align="right">
                      {row.status === 'review' ? (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            sx={{ mr: 1 }}
                            disabled={busyId === row.id}
                            onClick={() => approve(row.id)}
                          >
                            Подтвердить
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={busyId === row.id}
                            onClick={() => reject(row.id)}
                          >
                            Отклонить
                          </Button>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Подтверждение недоступно
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </>
  );
};

export default WalletPayments;
