import { MyRegistration } from '../api/clientApi';

export type TournamentTab = 'all' | 'past' | 'my';

export function isPastTournament(t: { start_date: string; registration_deadline: string }): boolean {
  const now = Date.now();
  const deadline = new Date(t.registration_deadline).getTime();
  const start = new Date(t.start_date).getTime();
  if (!Number.isNaN(deadline) && deadline < now) return true;
  if (!Number.isNaN(start) && start < now) return true;
  return false;
}

export function myRegForTournament(regs: MyRegistration[], tournamentId: number): MyRegistration | undefined {
  return regs.find((r) => r.tournament_id === tournamentId);
}

export function registrationStatusLabel(status: string): string {
  switch (status) {
    case 'approved':
      return 'Заявка одобрена';
    case 'rejected':
      return 'Заявка отклонена';
    case 'pending':
    default:
      return 'Заявка отправлена';
  }
}

export function registrationChipColor(
  status: string
): 'warning' | 'success' | 'error' | 'default' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'pending':
    default:
      return 'warning';
  }
}

export function filterTournamentsByTab<T extends { id: number; start_date: string; registration_deadline: string }>(
  list: T[],
  tab: TournamentTab,
  myRegs: MyRegistration[]
): T[] {
  if (tab === 'past') {
    return list.filter(isPastTournament);
  }
  if (tab === 'my') {
    const ids = new Set(myRegs.map((r) => r.tournament_id));
    return list.filter((t) => ids.has(t.id));
  }
  return list;
}
