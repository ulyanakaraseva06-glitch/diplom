import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Divider,
} from '@mui/material';
import confetti from 'canvas-confetti';
import { getApiErrorMessage } from '../utils/apiError';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      startVelocity: 15,
      colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5, x: 0.3 },
        startVelocity: 20,
      });
    }, 200);

    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5, x: 0.7 },
        startVelocity: 20,
      });
    }, 400);

    setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        startVelocity: 25,
      });
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const trimmed = { email: email.trim(), password };
    const response = await login(trimmed);
    
    // Проверяем предупреждение (если есть в ответе)
    if (response?.warning) {
      alert(`⚠️ Предупреждение от администратора:\n\n${response.warning}`);
    }
    
    triggerConfetti();
    setTimeout(() => {
      const role = JSON.parse(localStorage.getItem('user') || '{}')?.role;
      if (role === 'manager') navigate('/dashboard');
      else if (role === 'organizer') navigate('/my-tournaments');
      else navigate('/client/tournaments');
    }, 800);
  } catch (err: unknown) {
    setError(getApiErrorMessage(err, 'Ошибка входа'));
  } finally {
    setLoading(false);
  }
};

  const handleGuestLogin = () => {
    triggerConfetti();
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/client/tournaments');
    }, 800);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Вход
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
          
          <Divider sx={{ my: 3 }}>или</Divider>
          
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGuestLogin}
            sx={{ mb: 2 }}
          >
            Войти как гость
          </Button>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Нет аккаунта?{' '}
              <Button onClick={() => navigate('/register')}>
                Зарегистрироваться
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;