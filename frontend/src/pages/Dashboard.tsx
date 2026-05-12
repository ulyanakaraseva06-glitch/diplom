import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tournamentsApi } from '../api/tournaments';
import { registrationsApi } from '../api/registrations';
import { usersApi } from '../api/users';
import { supportApi } from '../api/support';
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
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BlockIcon from '@mui/icons-material/Block';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PeopleIcon from '@mui/icons-material/People';
import ChatIcon from '@mui/icons-material/Chat';

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

      let totalRegistrations = 0;
      if (allTournaments.length > 0) {
        try {
          const registrationsRes = await registrationsApi.getByTournament(allTournaments[0].id);
          totalRegistrations = (registrationsRes.data || []).length;
        } catch (e) {
          console.error(e);
        }
      }

      let unreadMessages = 0;
      if (user?.id) {
        try {
          const unreadRes = await supportApi.getUnreadCount(user.id);
          unreadMessages = unreadRes.data.unread_count;
        } catch (e) {
          console.error(e);
        }
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
            Административная панель
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username} ({user?.role === 'manager' ? 'Менеджер' : user?.role === 'organizer' ? 'Организатор' : 'Игрок'})
          </Typography>
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

            {(isManager || isOrganizer) && (
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <AssignmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h6">Заявки</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Модерация заявок на участие в турнирах
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
              </>
            )}
          </Grid>
        </Box>
      </Container>
    </>
  );
};

export default Dashboard;