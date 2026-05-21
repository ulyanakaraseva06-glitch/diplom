import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
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
  Paper,
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
import UsernameWithBadge from '../components/UsernameWithBadge';
import BoltIcon from '@mui/icons-material/Bolt';
import RecommendIcon from '@mui/icons-material/Recommend';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import UserProfileDialog from '../components/UserProfileDialog';
import {
  clientApi,
  PlayerUser,
  FriendRequestItem,
  Team,
  PublicProfile,
  Recommendation,
  TeamMemberRecommendation,
} from '../api/clientApi';
import { mediaUrl } from '../utils/media';
import { confirmDelete } from '../utils/confirmDelete';
import { friendRequestErrorMessage, parseNeo4jUserId } from '../utils/friendRequest';

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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [teamRecommendations, setTeamRecommendations] = useState<TeamMemberRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const data = await clientApi.getRecommendations();
      setRecommendations(Array.isArray(data) ? data : []);
    } catch {
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  const loadTeamRecommendations = useCallback(async (teamId?: string) => {
    try {
      const data = await clientApi.getTeamMemberRecommendations(teamId);
      setTeamRecommendations(Array.isArray(data) ? data : []);
    } catch {
      setTeamRecommendations([]);
    }
  }, []);

  const load = useCallback(async () => {
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
  }, [search]);

  useEffect(() => {
    load();
  }, [tab, load]);

  useEffect(() => {
    if (tab === 4) {
      loadRecommendations();
    }
  }, [tab, loadRecommendations]);

  useEffect(() => {
    if (tab === 3) {
      loadTeamRecommendations(editTeam?.id);
    }
  }, [tab, editTeam?.id, loadTeamRecommendations]);

  useEffect(() => {
    clientApi.getNotifications().then((list) => {
      const unread = list.find(
        (n: { is_read: boolean; type: string }) =>
          !n.is_read &&
          (n.type === 'friend_request' ||
            n.type === 'wallet_deposit_rejected' ||
            n.type === 'wallet_deposit_approved')
      );
      if (unread) setSnack(unread.body || unread.title);
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setSnack(friendRequestErrorMessage(msg));
    }
  };

  const respond = async (requestId: string, accept: boolean) => {
    try {
      await clientApi.respondFriendRequest(requestId, accept);
      setSnack(accept ? 'Друг добавлен' : 'Заявка отклонена');
      load();
      if (accept) loadRecommendations();
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
      if (tab === 4) loadRecommendations();
    } catch {
      setSnack('Не удалось удалить друга');
    }
  };

  const sendRequestFromRecommendation = async (userId: string) => {
    const numericId = parseNeo4jUserId(userId);
    if (numericId == null) return;
    setSendingRequest(userId);
    try {
      await clientApi.sendFriendRequest(numericId);
      setRecommendations((prev) => prev.filter((r) => r.user_id !== userId));
      setSnack('Заявка отправлена');
      void loadRecommendations();
      void load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setSnack(friendRequestErrorMessage(msg));
    } finally {
      setSendingRequest(null);
    }
  };

  const addRecommendedToTeam = (userId: string) => {
    const numericId = parseNeo4jUserId(userId);
    if (numericId == null) return;
    if (!selectedMembers.includes(numericId)) {
      setSelectedMembers((prev) => [...prev, numericId]);
      setSnack('Игрок добавлен в состав');
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
        <UsernameWithBadge username={u.username} hasSubscription={u.has_subscription} variant="h6" />
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
            <Tab label="Рекомендации" icon={<RecommendIcon />} iconPosition="start" />
          </Tabs>

          {tab !== 3 && tab !== 4 && (
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
                                  label={
                                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                      {m.is_leader ? `${m.username} (лидер)` : m.username}
                                      {m.has_subscription && (
                                        <BoltIcon sx={{ fontSize: 14, color: '#FFC107' }} />
                                      )}
                                    </Box>
                                  }
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

                  {teamRecommendations.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" gutterBottom>
                        Рекомендуемые участники для команды
                      </Typography>
                      <Grid container spacing={2}>
                        {teamRecommendations.map((rec) => (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={rec.user_id}>
                            <Card>
                              <CardContent>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {rec.nickname}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Общих игр: {rec.common_games} · MMR: {rec.mmr}
                                </Typography>
                                <Button
                                  size="small"
                                  sx={{ mt: 1 }}
                                  onClick={() => {
                                    openCreateTeam();
                                    addRecommendedToTeam(rec.user_id);
                                  }}
                                >
                                  В новую команду
                                </Button>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Box>
              )}

              {tab === 4 && (
                <Box>
                  {loadingRecs ? (
                    <Box display="flex" justifyContent="center" py={6}>
                      <CircularProgress />
                    </Box>
                  ) : recommendations.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <RecommendIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Нет рекомендаций
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Заполните игры в профиле — Neo4j подберёт игроков с похожими интересами.
                      </Typography>
                      <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/profile')}>
                        Заполнить профиль
                      </Button>
                    </Paper>
                  ) : (
                    <Grid container spacing={2}>
                      {recommendations.map((rec) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={rec.user_id}>
                          <Card sx={{ height: '100%' }}>
                            <CardContent>
                              <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                                  {rec.nickname?.charAt(0)?.toUpperCase() || '?'}
                                </Avatar>
                                <Box>
                                  <Typography variant="h6" fontWeight={600}>
                                    {rec.nickname}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Совместимость: {Math.round(rec.score)}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                                <Chip icon={<TrendingUpIcon />} label={`MMR: ${rec.mmr}`} color="primary" size="small" />
                                <Chip
                                  icon={<SportsEsportsIcon />}
                                  label={rec.role || 'роль не указана'}
                                  variant="outlined"
                                  size="small"
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                Общих игр: {rec.common_games}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Общих друзей: {rec.mutual_friends}
                              </Typography>
                              <Button
                                fullWidth
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                onClick={() => sendRequestFromRecommendation(rec.user_id)}
                                disabled={sendingRequest === rec.user_id}
                              >
                                {sendingRequest === rec.user_id ? 'Отправка...' : 'Добавить в друзья'}
                              </Button>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
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
                  <ListItemText
                    primary={
                      <UsernameWithBadge
                        username={f.username}
                        hasSubscription={f.has_subscription}
                      />
                    }
                  />
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
