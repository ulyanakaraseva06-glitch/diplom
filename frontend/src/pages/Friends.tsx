import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CardActions,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Checkbox,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatIcon from '@mui/icons-material/Chat';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import NavBar from '../components/NavBar';
import UserProfileDialog from '../components/UserProfileDialog';
import { clientApi, PlayerUser, FriendRequestItem, Team, PublicProfile } from '../api/clientApi';
import { mediaUrl } from '../utils/media';
import { confirmDelete } from '../utils/confirmDelete';

const Friends: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<PlayerUser[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [players, setPlayers] = useState<PlayerUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [viewProfile, setViewProfile] = useState<PublicProfile | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamAvatar, setTeamAvatar] = useState('');
  const [teamAvatarPreview, setTeamAvatarPreview] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [pickFriendsOpen, setPickFriendsOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [f, req, p, t] = await Promise.all([
        clientApi.getFriends(search),
        clientApi.getFriendRequests(search),
        clientApi.searchPlayers(search),
        clientApi.getTeams(),
      ]);
      setFriends(f);
      setIncoming(req.incoming || []);
      setOutgoing(req.outgoing || []);
      setPlayers(p);
      setTeams(t);
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

  const openUserProfile = async (userId: number) => {
    setProfileOpen(true);
    setProfileLoading(true);
    setViewProfile(null);
    try {
      const p = await clientApi.getPublicProfile(userId);
      setViewProfile(p);
    } catch {
      setViewProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

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

  const removeFriend = async (id: number) => {
    if (!confirmDelete()) return;
    try {
      await clientApi.removeFriend(id);
      setSnack('Друг удалён');
      load();
    } catch {
      setSnack('Не удалось удалить друга');
    }
  };

  const resetTeamForm = () => {
    setTeamName('');
    setTeamAvatar('');
    setTeamAvatarPreview('');
    setSelectedMembers([]);
    setEditTeam(null);
  };

  const openCreateTeam = () => {
    resetTeamForm();
    setCreateOpen(true);
  };

  const openEditTeam = (team: Team) => {
    setEditTeam(team);
    setTeamName(team.name);
    setTeamAvatar(team.avatar_url);
    setTeamAvatarPreview(mediaUrl(team.avatar_url) || '');
    setSelectedMembers(team.members.filter((m) => !m.is_leader).map((m) => m.id));
    setCreateOpen(true);
  };

  const uploadTeamAvatar = async (file: File) => {
    try {
      const url = await clientApi.uploadImage(file);
      setTeamAvatar(url);
      setTeamAvatarPreview(mediaUrl(url) || '');
      setSnack('Изображение загружено — нажмите «Сохранить»');
    } catch {
      setSnack('Ошибка загрузки изображения');
    }
  };

  const saveTeam = async () => {
    if (!teamName.trim()) {
      setSnack('Введите название команды');
      return;
    }
    try {
      if (editTeam) {
        await clientApi.updateTeam(editTeam.id, {
          name: teamName.trim(),
          avatar_url: teamAvatar,
          member_ids: selectedMembers,
        });
        setSnack('Команда обновлена');
      } else {
        await clientApi.createTeam({
          name: teamName.trim(),
          avatar_url: teamAvatar,
          member_ids: selectedMembers,
        });
        setSnack('Команда создана');
      }
      setCreateOpen(false);
      resetTeamForm();
      load();
    } catch {
      setSnack('Ошибка сохранения команды');
    }
  };

  const toggleMember = (id: number) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const UserCard: React.FC<{
    u: PlayerUser;
    actions?: React.ReactNode;
    onClick?: () => void;
  }> = ({ u, actions, onClick }) => (
    <Card
      sx={{ height: '100%', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <CardContent sx={{ textAlign: 'center' }}>
        <Avatar
          src={mediaUrl(u.avatar_url)}
          sx={{ width: 72, height: 72, mx: 'auto', mb: 1, bgcolor: 'primary.main' }}
        >
          <PersonIcon />
        </Avatar>
        <Typography variant="h6">{u.username}</Typography>
        <Box sx={{ mt: 2 }} onClick={(e) => e.stopPropagation()}>
          {actions}
        </Box>
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

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
            <Tab label="Мои друзья" />
            <Tab label="Заявки" />
            <Tab label="Поиск" />
            <Tab label="Команда" icon={<GroupsIcon />} iconPosition="start" />
          </Tabs>

          {tab !== 3 && (
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
          )}

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
                      <UserCard
                        u={u}
                        onClick={() => openUserProfile(u.id)}
                        actions={
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<PersonRemoveIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFriend(u.id);
                            }}
                          >
                            Удалить
                          </Button>
                        }
                      />
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
                          onClick={() => openUserProfile(r.user.id)}
                          actions={
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<CheckIcon />}
                                onClick={() => respond(r.id, true)}
                              >
                                Принять
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<CloseIcon />}
                                onClick={() => respond(r.id, false)}
                              >
                                Отклонить
                              </Button>
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
                        onClick={u.status === 'friend' ? () => openUserProfile(u.id) : undefined}
                        actions={
                          u.status === 'friend' ? (
                            <Chip label="Уже друг" color="success" />
                          ) : u.status === 'sent' ? (
                            <Chip label="Заявка отправлена" color="warning" />
                          ) : u.status === 'incoming' ? (
                            <Chip label="Вам отправили заявку" color="info" />
                          ) : (
                            <Button
                              variant="contained"
                              startIcon={<PersonAddIcon />}
                              onClick={() => sendRequest(u.id)}
                            >
                              Отправить заявку
                            </Button>
                          )
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              )}

              {tab === 3 && (
                <Box>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {teams.map((team) => (
                      <Grid size={{ xs: 12, md: 6 }} key={team.id}>
                        <Card>
                          <CardContent>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                              <Avatar
                                src={mediaUrl(team.avatar_url)}
                                sx={{ width: 64, height: 64 }}
                              >
                                <GroupsIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="h6">{team.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Участников: {team.members.length}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                              {team.members.map((m) => (
                                <Chip
                                  key={m.id}
                                  size="small"
                                  avatar={<Avatar src={mediaUrl(m.avatar_url)} />}
                                  label={m.is_leader ? `${m.username} (лидер)` : m.username}
                                />
                              ))}
                            </Box>
                          </CardContent>
                          <CardActions>
                            <Button
                              variant="contained"
                              startIcon={<ChatIcon />}
                              onClick={() =>
                                navigate('/messenger', {
                                  state: { chatPeerId: team.chat_peer_id },
                                })
                              }
                            >
                              Перейти в чат
                            </Button>
                            {team.is_leader && (
                              <Button
                                startIcon={<EditIcon />}
                                onClick={() => openEditTeam(team)}
                              >
                                Изменить состав
                              </Button>
                            )}
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                    {teams.length === 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Alert severity="info">У вас пока нет команд. Создайте первую!</Alert>
                      </Grid>
                    )}
                  </Grid>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={openCreateTeam}
                  >
                    Создать команду
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Container>

      <UserProfileDialog
        open={profileOpen}
        profile={viewProfile}
        loading={profileLoading}
        onClose={() => setProfileOpen(false)}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTeam ? 'Изменить команду' : 'Создать команду'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Avatar src={teamAvatarPreview || undefined} sx={{ width: 80, height: 80, mb: 1 }}>
              <GroupsIcon />
            </Avatar>
            <input
              type="file"
              accept="image/*"
              hidden
              id="team-avatar-upload"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadTeamAvatar(f);
                e.target.value = '';
              }}
            />
            <label htmlFor="team-avatar-upload">
              <Button component="span" variant="outlined" startIcon={<PhotoCameraIcon />}>
                Аватарка
              </Button>
            </label>
            {teamAvatar && (
              <Button size="small" sx={{ mt: 1 }} onClick={() => setSnack('Аватар будет сохранён с командой')}>
                Картинка выбрана ✓
              </Button>
            )}
          </Box>
          <TextField
            fullWidth
            label="Название команды"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setPickFriendsOpen(true)} fullWidth>
            Добавить участников ({selectedMembers.length})
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveTeam}>
            {editTeam ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pickFriendsOpen} onClose={() => setPickFriendsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Выберите друзей</DialogTitle>
        <DialogContent dividers>
          <List>
            {friends.map((f) => (
              <ListItem key={f.id} disablePadding>
                <ListItemButton onClick={() => toggleMember(f.id)}>
                  <Checkbox checked={selectedMembers.includes(f.id)} />
                  <ListItemAvatar>
                    <Avatar src={mediaUrl(f.avatar_url)}>{f.username[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={f.username} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickFriendsOpen(false)}>Готово</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} message={snack} onClose={() => setSnack('')} />
    </>
  );
};

export default Friends;
