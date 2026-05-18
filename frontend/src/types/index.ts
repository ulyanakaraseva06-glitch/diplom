// Пользователь
export interface User {
  id: number;
  email: string;
  username: string;
  role: 'user' | 'organizer' | 'manager';
  created_at: string;
}

// Авторизация
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Турнир
export interface Tournament {
  id: number;
  title: string;
  game: string;
  description?: string;
  start_date: string;
  registration_deadline: string;
  entry_fee: number;
  prize_pool: number;
  max_teams: number;
  status: 'pending' | 'approved' | 'ongoing' | 'completed' | 'cancelled';
  organizer_id: number;
  organizer?: User;
  registered_teams?: number;
  created_at: string;
  updated_at: string;
  is_vip?: boolean;
  banner_url?: string; // ← ДОБАВИТЬ
}

export interface TournamentCreate {
  title: string;
  game: string;
  description?: string;
  start_date: string;
  registration_deadline: string;
  entry_fee: number;
  prize_pool: number;
  max_teams: number;
  is_vip?: boolean;
  banner_url?: string; // ← ДОБАВИТЬ
}

export interface TournamentUpdate {
  title?: string;
  game?: string;
  description?: string;
  start_date?: string;
  registration_deadline?: string;
  entry_fee?: number;
  prize_pool?: number;
  max_teams?: number;
  status?: Tournament['status'];
  is_vip?: boolean;
  banner_url?: string; // ← ДОБАВИТЬ
}

// Заявка на турнир
export interface Registration {
  id: number;
  tournament_id: number;
  user_id: number;
  team_name: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_status: 'pending' | 'paid' | 'refunded';
  registered_at: string;
  username?: string;
  email?: string;
  tournament_title?: string;
}

export interface RegistrationRequest {
  tournament_id: number;
  team_name: string;
}

// Блокировка
export interface Ban {
  id: number;
  user_id: number;
  username?: string;
  moderator_id: number;
  moderator_name?: string;
  reason: string;
  banned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface BanRequest {
  user_id: number;
  reason: string;
  expires_at?: string | null;
}

// Сообщение чата
export interface SupportMessage {
  id: number;
  user_id: number;
  username?: string;
  manager_id?: number;
  manager_name?: string;
  message: string;
  is_from_user: boolean;
  is_read: boolean;
  created_at: string;
}

export interface SupportMessageCreate {
  message: string;
}

export interface Participant {
  id: number;
  user_id: number;
  username: string;
  team_name: string;
  registered_at: string;
}

export interface TournamentWithParticipants extends Tournament {
  participants: Participant[];
}

// Подписка
export interface UserSubscription {
  id: string;
  user_id: number;
  subscription_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  auto_renew: boolean;
}