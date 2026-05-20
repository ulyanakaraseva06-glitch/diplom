const API = 'http://localhost:8080/api';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

async function handleJsonArray<T>(res: Response): Promise<T[]> {
  const data = await handleJson<T[] | null>(res);
  return Array.isArray(data) ? data : [];
}

export interface WalletDepositAdminItem {
  id: string;
  user_id: number;
  username: string;
  email: string;
  amount: number;
  status: string;
  purpose: string;
  created_at: string;
}

export interface GameCard {
  id: string;
  game: string;
  rank: string;
  comment: string;
}

export interface PlayerUser {
  id: number;
  username: string;
  email: string;
  avatar_url: string;
  status?: string;
  has_subscription?: boolean;
}

export interface DragonRunnerLeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  avatar_url: string;
  score: number;
}

export interface FriendRequestItem {
  id: string;
  from_user_id: number;
  to_user_id: number;
  direction: 'incoming' | 'outgoing';
  created_at: string;
  user: PlayerUser;
}

export interface ChatPreview {
  id: number;
  username: string;
  avatar_url: string;
  is_support: boolean;
  is_team?: boolean;
  team_id?: string;
}

export interface PublicProfile {
  id: number;
  username: string;
  avatar_url: string;
  has_subscription?: boolean;
  game_cards: GameCard[];
}

export interface TeamMember {
  id: number;
  username: string;
  avatar_url: string;
  is_leader: boolean;
  has_subscription?: boolean;
}

export interface Team {
  id: string;
  chat_peer_id: number;
  name: string;
  avatar_url: string;
  leader_id: number;
  members: TeamMember[];
  is_leader: boolean;
}

export interface ClientTournament {
  id: number;
  title: string;
  game: string;
  max_teams: number;
  description: string;
  status: string;
  start_date: string;
  registration_deadline: string;
  entry_fee: number;
  prize_pool: number;
  banner_url: string;
  is_vip: boolean;
  organizer_id: number;
  organizer_username: string;
}

export interface TournamentOrganizer {
  id: number;
  username: string;
}

export interface MyRegistration {
  id: number;
  tournament_id: number;
  tournament_title: string;
  team_name: string;
  status: string;
  registered_at: string;
}

export interface TournamentApplication {
  id: number;
  tournament_id: number;
  tournament_title: string;
  organizer_id: number;
  organizer_username: string;
  user_id: number;
  username: string;
  email: string;
  team_name: string;
  status: string;
  payment_status: string;
  registered_at: string;
}

export interface ChatMessage {
  id: number | string;
  text: string;
  image_url?: string;
  from_me: boolean;
  is_support?: boolean;
  created_at: string;
  username?: string;
}

export interface UserSubscription {
  id: string;
  user_id: number;
  subscription_id: string;
  team_id?: string;
  source?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  auto_renew?: boolean;
  subscription_name?: string;
  target_type?: string;
  team_name?: string;
  can_cancel?: boolean;
}

export interface MySubscriptionsResponse {
  subscriptions: UserSubscription[];
  has_personal: boolean;
  has_team: boolean;
  has_active: boolean;
}

export interface Recommendation {
  user_id: string;
  nickname: string;
  mmr: number;
  role: string;
  common_games: number;
  mutual_friends: number;
  score: number;
}

function isSubscriptionActive(sub: UserSubscription | null | undefined): boolean {
  if (!sub) return false;
  if (sub.is_active === false) return false;
  if (!sub.end_date) return true;
  return new Date(sub.end_date) > new Date();
}

export const clientApi = {
  getProfile: () =>
    fetch(`${API}/client/profile`, { headers: authHeaders() }).then(handleJson<any>),

  updateGameCards: (game_cards: GameCard[]) =>
    fetch(`${API}/client/profile/game-cards`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ game_cards }),
    }).then(handleJson<{ game_cards: GameCard[] }>),

  updateAvatar: (avatar_url: string) =>
    fetch(`${API}/client/profile/avatar`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ avatar_url }),
    }).then(handleJson<{ avatar_url: string }>),

  uploadImage: async (file: File): Promise<string> => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${API}/client/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await handleJson<{ url: string }>(res);
    return data.url;
  },

  getWallet: () =>
    fetch(`${API}/client/wallet`, { headers: authHeaders() }).then(handleJson<{ balance: number }>),

  deposit: (amount: number) =>
    fetch(`${API}/client/wallet/deposit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ amount }),
    }).then(handleJson<{ balance: number }>),

  createWalletDeposit: (amount: number) =>
    fetch(`${API}/client/wallet/deposit/create`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ amount }),
    }).then(
      handleJson<{
        deposit_id: string;
        amount: number;
        status: string;
        purpose: string;
      }>
    ),

  getWalletDepositStatus: (depositId: string) =>
    fetch(`${API}/client/wallet/deposit/${encodeURIComponent(depositId)}/status`, {
      headers: authHeaders(),
    }).then(
      handleJson<{
        deposit_id: string;
        amount: number;
        status: string;
        qr_payload: string;
        purpose: string;
        balance?: number;
      }>
    ),

  confirmWalletDeposit: (depositId: string) =>
    fetch(`${API}/client/wallet/deposit/${encodeURIComponent(depositId)}/confirm`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(
      handleJson<{
        deposit_id: string;
        status: string;
        message: string;
        balance?: number;
      }>
    ),

  listWalletDepositsAdmin: () =>
    fetch(`${API}/admin/wallet-deposits`, { headers: authHeaders() }).then(
      handleJson<WalletDepositAdminItem[]>
    ),

  approveWalletDepositAdmin: (depositId: string) =>
    fetch(`${API}/admin/wallet-deposits/${encodeURIComponent(depositId)}/approve`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleJson<{ message: string }>),

  rejectWalletDepositAdmin: (depositId: string) =>
    fetch(`${API}/admin/wallet-deposits/${encodeURIComponent(depositId)}/reject`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleJson<{ message: string }>),

  paySubscription: (subscription_id: string, team_id?: string) =>
    fetch(`${API}/subscriptions/pay`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ subscription_id, team_id: team_id || undefined }),
    }).then(
      handleJson<{
        message: string;
        balance: number;
        subscription: UserSubscription;
        subscriptions?: UserSubscription[];
        has_personal?: boolean;
        has_team?: boolean;
        has_active?: boolean;
      }>
    ),

  getMySubscriptions: async (): Promise<MySubscriptionsResponse> => {
    const empty: MySubscriptionsResponse = {
      subscriptions: [],
      has_personal: false,
      has_team: false,
      has_active: false,
    };
    const res = await fetch(`${API}/subscriptions/my`, { headers: authHeaders() });
    if (!res.ok) return empty;
    const text = await res.text();
    if (!text || text === 'null') return empty;
    const data = JSON.parse(text) as MySubscriptionsResponse | UserSubscription;
    if (Array.isArray((data as MySubscriptionsResponse).subscriptions)) {
      return data as MySubscriptionsResponse;
    }
    const legacy = data as UserSubscription;
    if (!legacy.id && !legacy.subscription_id) return empty;
    const active = isSubscriptionActive(legacy);
    const isTeam =
      legacy.source === 'team' || !!legacy.team_id || legacy.target_type === 'team' || legacy.subscription_id === 'sub_team';
    return {
      subscriptions: active ? [legacy] : [],
      has_personal: active && !isTeam,
      has_team: active && isTeam,
      has_active: active,
    };
  },

  /** Первая активная подписка (для обратной совместимости). */
  getMySubscription: async (): Promise<UserSubscription | null> => {
    const { subscriptions, has_active } = await clientApi.getMySubscriptions();
    if (!has_active || subscriptions.length === 0) return null;
    return subscriptions[0];
  },

  searchPlayers: (search: string) =>
    fetch(`${API}/client/users?search=${encodeURIComponent(search)}`, {
      headers: authHeaders(),
    }).then(handleJsonArray<PlayerUser>),

  getFriends: (search = '') =>
    fetch(`${API}/client/friends/list?search=${encodeURIComponent(search)}`, {
      headers: authHeaders(),
    }).then(handleJsonArray<PlayerUser>),

  getFriendRequests: (search = '') =>
    fetch(`${API}/client/friends/requests?search=${encodeURIComponent(search)}`, {
      headers: authHeaders(),
    }).then(handleJson<{ incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] }>),

  sendFriendRequest: (friend_id: number) =>
    fetch(`${API}/client/friends/request`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ friend_id }),
    }).then(handleJson<any>),

  respondFriendRequest: (request_id: string, accept: boolean) =>
    fetch(`${API}/client/friends/respond`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ request_id, accept }),
    }).then(handleJson<any>),

  removeFriend: (friendId: number) =>
    fetch(`${API}/client/friends/${friendId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleJson<{ message: string }>),

  getNotifications: () =>
    fetch(`${API}/client/notifications`, { headers: authHeaders() }).then(handleJsonArray<any>),

  getChats: (search = '') =>
    fetch(`${API}/client/chats?search=${encodeURIComponent(search)}`, {
      headers: authHeaders(),
    }).then(handleJsonArray<ChatPreview>),

  getMessages: (peerId: number) =>
    fetch(`${API}/client/chats/${peerId}/messages`, { headers: authHeaders() }).then(
      handleJsonArray<ChatMessage>
    ),

  sendMessage: (peerId: number, text: string, image_url?: string) =>
    fetch(`${API}/client/chats/${peerId}/messages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text, image_url }),
    }).then(handleJson<ChatMessage>),

  deleteChat: (peerId: number) =>
    fetch(`${API}/client/chats/${peerId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleJson<{ message: string }>),

  getPublicProfile: (userId: number) =>
    fetch(`${API}/client/users/${userId}/profile`, { headers: authHeaders() }).then(
      handleJson<PublicProfile>
    ),

  getTeams: () =>
    fetch(`${API}/client/teams`, { headers: authHeaders() }).then(handleJsonArray<Team>),

  createTeam: (data: { name: string; avatar_url: string; member_ids: number[] }) =>
    fetch(`${API}/client/teams`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleJson<Team>),

  updateTeam: (teamId: string, data: { name?: string; avatar_url?: string; member_ids: number[] }) =>
    fetch(`${API}/client/teams/${teamId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleJson<Team>),

  getClientTournaments: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${API}/client/tournaments${q ? `?${q}` : ''}`).then(
      handleJsonArray<ClientTournament>
    );
  },

  getTournamentOrganizers: () =>
    fetch(`${API}/client/tournaments/organizers`).then(handleJsonArray<TournamentOrganizer>),

  registerTournament: (body: { tournament_id: number; team_id?: string; team_name?: string }) =>
    fetch(`${API}/client/register`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handleJson<any>),

  getMyRegistrations: () =>
    fetch(`${API}/client/registrations/my`, { headers: authHeaders() }).then(
      handleJsonArray<MyRegistration>
    ),

  cancelRegistration: (id: number) =>
    fetch(`${API}/client/registrations/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleJson<{ message: string }>),

  getRegistrationApplications: (status = '') => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetch(`${API}/client/registrations/applications${q}`, {
      headers: authHeaders(),
    }).then(handleJsonArray<TournamentApplication>);
  },

  getDragonRunnerLeaderboard: () =>
    fetch(`${API}/client/minigame/leaderboard`, { headers: authHeaders() }).then(
      handleJsonArray<DragonRunnerLeaderboardEntry>
    ),

  submitDragonRunnerScore: (score: number) =>
    fetch(`${API}/client/minigame/score`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ score }),
    }).then(handleJson<{ best_score: number; improved: boolean }>),

  getRecommendations: (limit: number = 10): Promise<Recommendation[]> =>
  fetch(`${API}/client/recommendations?limit=${limit}`, { headers: authHeaders() })
    .then(handleJsonArray<Recommendation>),
};
