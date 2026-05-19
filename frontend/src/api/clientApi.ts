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
}

export interface ChatMessage {
  id: number | string;
  text: string;
  image_url?: string;
  from_me: boolean;
  is_support?: boolean;
  created_at: string;
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
};
