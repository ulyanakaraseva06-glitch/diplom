import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import NavBar from '../components/NavBar';
import { clientApi, PlayerUser, FriendRequestItem } from '../api/clientApi';

const Friends: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<PlayerUser[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [players, setPlayers] = useState<PlayerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [f, req, p] = await Promise.all([
        clientApi.getFriends(search),
        clientApi.getFriendRequests(search),
        clientApi.searchPlayers(search),
      ]);
      setFriends(f);
      setIncoming(req.incoming || []);
      setOutgoing(req.outgoing || []);
      setPlayers(p);
    } catch {
      setSnack('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab, search]);

  useEffect(() => {
    clientApi.getNotifications().then((list) => {
      const unread = list.find((n: any) => !n.is_read && n.type === 'friend_request');
      if (unread) setSnack(unread.body);
    }).catch(() => {});
  }, []);

  const sendRequest = async (id: number) => {
    try {
      await clientApi.sendFriendRequest(id);
      setSnack('Заявка отправлена');
      load();
    } catch (e: any) {
      setSnack(e.message?.includes('exists') ? 'Заявка уже отправлена' : 'Ошибка отправки');
    }
  };

  const respond = async (requestId: string, accept: boolean) => {
    try {
      await clientApi.respondFriendRequest(requestId, accept);
      setSnack(accept ? 'Друг добавлен' : 'Заявка отклонена');
      load();
    } catch {
      setSnack('Ошибка');
    }
  };

  const UserCard: React.FC<{ u: PlayerUser; actions?: React.ReactNode }> = ({ u, actions }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ textAlign: 'center' }}>
        <Avatar
          src={u.avatar_url || undefined}
          sx={{ width: 72, height: 72, mx: 'auto', mb: 1, bgcolor: 'primary.main' }}
        >
          <PersonIcon />
        </Avatar>
        <Typography variant="h6">{u.username}</Typography>
        <Box sx={{ mt: 2 }}>{actions}</Box>
      </CardContent>
    </Card>
  );

  return (
    <>
      <NavBar />
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom>
            Друзья
          </Typography>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Мои друзья" />
            <Tab label="Заявки в друзья" />
            <Tab label="Поиск" />
          </Tabs>

          <Tooltip title="Введите никнейм для фильтрации списка">
            <TextField
              fullWidth
              size="small"
              placeholder="Поиск по никнейму..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ mb: 3 }}
            />
          </Tooltip>

          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {tab === 0 && (
                <Grid container spacing={2}>
                  {friends.length === 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Alert severity="info">Пока нет друзей. Найдите игроков во вкладке «Поиск»</Alert>
                    </Grid>
                  )}
                  {friends.map((u) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={u.id}>
                      <UserCard u={u} actions={<Chip label="В друзьях" color="success" />} />
                    </Grid>
                  ))}
                </Grid>
              )}

              {tab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Входящие
                  </Typography>
                  {incoming.length === 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>Нет входящих заявок</Alert>
                  )}
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    {incoming.map((r) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.id}>
                        <UserCard
                          u={r.user}
                          actions={
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Tooltip title="Принять заявку">
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  startIcon={<CheckIcon />}
                                  onClick={() => respond(r.id, true)}
                                >
                                  Принять
                                </Button>
                              </Tooltip>
                              <Tooltip title="Отклонить">
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  startIcon={<CloseIcon />}
                                  onClick={() => respond(r.id, false)}
                                >
                                  Отклонить
                                </Button>
                              </Tooltip>
                            </Box>
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>

                  <Typography variant="h6" gutterBottom>
                    Отправленные
                  </Typography>
                  {outgoing.length === 0 && <Alert severity="info">Нет исходящих заявок</Alert>}
                  <Grid container spacing={2}>
                    {outgoing.map((r) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.id}>
                        <UserCard u={r.user} actions={<Chip label="Ожидает ответа" color="warning" />} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {tab === 2 && (
                <Grid container spacing={2}>
                  {players.map((u) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={u.id}>
                      <UserCard
                        u={u}
                        actions={
                          u.status === 'friend' ? (
                            <Chip label="Уже друг" color="success" />
                          ) : u.status === 'sent' ? (
                            <Chip label="Заявка отправлена" color="warning" />
                          ) : u.status === 'incoming' ? (
                            <Chip label="Вам отправили заявку" color="info" />
                          ) : (
                            <Tooltip title="Отправить заявку в друзья">
                              <Button
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                onClick={() => sendRequest(u.id)}
                              >
                                Отправить заявку
                              </Button>
                            </Tooltip>
                          )
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </Box>
      </Container>
      <Snackbar open={!!snack} autoHideDuration={4000} message={snack} onClose={() => setSnack('')} />
    </>
  );
};

export default Friends;
