import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { clientApi } from '../api/clientApi';

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      const data = await clientApi.getWallet();
      setBalance(data.balance);
    } catch {
      setError('Не удалось загрузить баланс');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDeposit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setError('Введите сумму больше нуля');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await clientApi.deposit(val);
      setBalance(data.balance);
      setSuccess(`Баланс пополнен на ${val} ₽`);
      setAmount('');
    } catch {
      setError('Ошибка пополнения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <NavBar />
      <Container maxWidth="sm">
        <Box sx={{ mt: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
            Назад
          </Button>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" gutterBottom>
              Мой кошелёк
            </Typography>
            {loading ? (
              <CircularProgress />
            ) : (
              <>
                <Typography variant="h3" color="primary" sx={{ my: 2 }}>
                  {balance.toFixed(0)} ₽
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Средства можно использовать для оплаты подписки в разделе «Подписка»
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                <Tooltip title="Укажите сумму и нажмите «Пополнить»">
                  <TextField
                    fullWidth
                    label="Сумма пополнения (₽)"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                </Tooltip>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleDeposit}
                  disabled={saving}
                >
                  {saving ? 'Пополнение...' : 'Пополнить'}
                </Button>
              </>
            )}
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default Wallet;
