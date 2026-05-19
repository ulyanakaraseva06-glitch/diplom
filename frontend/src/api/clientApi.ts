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
  game_cards: GameCard[];
}

export interface TeamMember {
  id: number;
  username: string;
  avatar_url: string;
  is_leader: boolean;
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
  is_active: boolean;
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

  paySubscription: (subscription_id: string) =>
    fetch(`${API}/subscriptions/pay`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ subscription_id }),
    }).then(handleJson<any>),

  getMySubscription: async (): Promise<UserSubscription | null> => {
    const res = await fetch(`${API}/subscriptions/my`, { headers: authHeaders() });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text === 'null') return null;
    return JSON.parse(text) as UserSubscription;
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
};
