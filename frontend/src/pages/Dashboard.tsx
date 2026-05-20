import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tournamentsApi } from '../api/tournaments';
import { registrationsApi } from '../api/registrations';
import { usersApi } from '../api/users';
import { supportApi } from '../api/support';
import { apiClient } from '../api/client';
import EventCalendar from '../components/EventCalendar';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import ComputerIcon from '@mui/icons-material/Computer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BlockIcon from '@mui/icons-material/Block';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PeopleIcon from '@mui/icons-material/People';
import ChatIcon from '@mui/icons-material/Chat';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const Dashboard: React.FC = () => {
  const { user, isManager, isOrganizer, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTournaments: 0,
    pendingTournaments: 0,
    totalUsers: 0,
    totalRegistrations: 0,
    unreadMessages: 0,
  });

const loadStats = async () => {
  try {
    const tournamentsRes = await tournamentsApi.getAll();
    const allTournaments = tournamentsRes.data || [];
    const pendingTournaments = allTournaments.filter((t: any) => t.status === 'pending');

    const usersRes = await usersApi.getAll();
    const users = usersRes.data || [];

    // Получаем статистику через новый API /stats
    let totalRegistrations = 0;
    let unreadMessages = 0;
    try {
      const statsRes = await apiClient.get('/stats');
      totalRegistrations = statsRes.data.total_registrations || 0;
      unreadMessages = statsRes.data.unread_messages || 0;
    } catch (e) {
      console.error('Ошибка загрузки статистики заявок/сообщений', e);
    }

    setStats({
      totalTournaments: allTournaments.length,
      pendingTournaments: pendingTournaments.length,
      totalUsers: users.length,
      totalRegistrations: totalRegistrations,
      unreadMessages: unreadMessages,
    });
  } catch (err) {
    console.error('Ошибка загрузки статистики', err);
  }
};

  useEffect(() => {
    loadStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    <Box
  component="img"
  src="/images/adminn.png"
  alt="Логотип"
  sx={{ height: 110 }}
/>
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username} ({user?.role === 'manager' ? 'Менеджер' : user?.role === 'organizer' ? 'Организатор' : 'Игрок'})
          </Typography>
          <Button
            color="inherit"
            startIcon={<ComputerIcon />}
            onClick={() => navigate('/themes')}
            sx={{ mr: 1 }}
          >
            Темы
          </Button>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Добро пожаловать, {user?.username}!
          </Typography>

          {/* Статистика - карточки */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <EmojiEventsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">{stats.totalTournaments}</Typography>
                <Typography variant="body2" color="text.secondary">Всего турниров</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <EmojiEventsIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                <Typography variant="h4">{stats.pendingTournaments}</Typography>
                <Typography variant="body2" color="text.secondary">Ожидают подтверждения</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                <Typography variant="h4">{stats.totalUsers}</Typography>
                <Typography variant="body2" color="text.secondary">Пользователей</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <AssignmentIcon sx={{ fontSize: 40, color: 'info.main' }} />
                <Typography variant="h4">{stats.totalRegistrations}</Typography>
                <Typography variant="body2" color="text.secondary">Всего заявок</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <ChatIcon sx={{ fontSize: 40, color: 'error.main' }} />
                <Typography variant="h4">{stats.unreadMessages}</Typography>
                <Typography variant="body2" color="text.secondary">Непрочитанных сообщений</Typography>
              </Paper>
            </Grid>
          </Grid>
          <Box sx={{ mb: 4, height: 600, overflow: 'auto' }}>
            <EventCalendar />
             </Box>
          {/* Карточки навигации */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <EmojiEventsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6">Турниры</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Управление турнирами: создание, редактирование, удаление, подтверждение
                  </Typography>
                  <Button variant="contained" onClick={() => navigate('/tournaments')}>
                    Перейти
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {isManager && (
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <AssignmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h6">Заявки</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Модерация заявок на участие
                    </Typography>
                    <Button variant="contained" color="warning" onClick={() => navigate('/registrations')}>
                      Перейти
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {isManager && (
              <>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <BlockIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                      <Typography variant="h6">Блокировки</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Управление блокировками пользователей
                      </Typography>
                      <Button variant="contained" color="error" onClick={() => navigate('/bans')}>
                        Перейти
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <SupportAgentIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h6">Чат поддержки</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Общение с пользователями в реальном времени
                      </Typography>
                      <Button variant="contained" color="success" onClick={() => navigate('/support')}>
                        Перейти
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <AccountBalanceWalletIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                      <Typography variant="h6">Пополнения кошелька</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Подтверждение оплат по СБП
                      </Typography>
                      <Button variant="contained" color="info" onClick={() => navigate('/wallet-payments')}>
                        Перейти
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default Dashboard;