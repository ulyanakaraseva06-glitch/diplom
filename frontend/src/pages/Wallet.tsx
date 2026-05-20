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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentIcon from '@mui/icons-material/Payment';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { clientApi } from '../api/clientApi';

const QR_IMAGE = `${process.env.PUBLIC_URL}/qr.jpg`;

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [depositId, setDepositId] = useState('');
  const [payAmount, setPayAmount] = useState(0);

  const load = async () => {
    try {
      const data = await clientApi.getWallet();
      setBalance(data.balance);
      const notes = await clientApi.getNotifications();
      const walletNote = notes.find(
        (n: { is_read: boolean; type: string }) =>
          !n.is_read && (n.type === 'wallet_deposit_rejected' || n.type === 'wallet_deposit_approved')
      );
      if (walletNote) {
        setSuccess(walletNote.body || walletNote.title);
      }
    } catch {
      setError('Не удалось загрузить баланс');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handlePay = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setError('Введите сумму больше нуля');
      return;
    }
    setPaying(true);
    setError('');
    setSuccess('');
    try {
      const data = await clientApi.createWalletDeposit(val);
      setDepositId(data.deposit_id);
      setPayAmount(data.amount);
      setPayOpen(true);
    } catch (e) {
      const raw = e instanceof Error ? e.message : '';
      setError(raw || 'Не удалось создать платёж');
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!depositId) return;
    setSubmitting(true);
    setError('');
    try {
      const data = await clientApi.confirmWalletDeposit(depositId);
      setPayOpen(false);
      setDepositId('');
      setAmount('');
      setSuccess(data.message || 'Заявка отправлена на проверку администратору');
    } catch (e) {
      const raw = e instanceof Error ? e.message : '';
      setError(raw || 'Не удалось отправить заявку');
    } finally {
      setSubmitting(false);
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
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert severity={success.includes('отклон') ? 'warning' : 'success'} sx={{ mb: 2 }}>
                    {success}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Сумма (₽)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<PaymentIcon />}
                  onClick={handlePay}
                  disabled={paying}
                >
                  {paying ? 'Подготовка...' : 'Оплатить'}
                </Button>
              </>
            )}
          </Paper>
        </Box>
      </Container>

      <Dialog open={payOpen} onClose={() => !submitting && setPayOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>Оплата через СБП</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" color="primary" fontWeight={700}>
              {payAmount.toFixed(0)} ₽
            </Typography>
            <Box
              component="img"
              src={QR_IMAGE}
              alt="QR для оплаты СБП"
              sx={{
                width: '100%',
                maxWidth: 280,
                height: 'auto',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
            <Typography variant="body2" color="text.secondary" align="center">
              Отсканируйте QR-код в приложении банка и переведите указанную сумму через Систему быстрых платежей (СБП).
            </Typography>
            <Typography variant="caption" color="warning.main" align="center" fontWeight={600}>
              Обязательно нажмите «Я оплатил» после перевода — иначе заявка не попадёт администратору.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 2 }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleConfirmPaid}
            disabled={submitting}
          >
            {submitting ? 'Отправка...' : 'Я оплатил'}
          </Button>
          <Button fullWidth onClick={() => setPayOpen(false)} disabled={submitting}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Wallet;
