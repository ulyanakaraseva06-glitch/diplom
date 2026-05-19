import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { clientApi, Team } from '../api/clientApi';

interface Props {
  open: boolean;
  tournamentId: number | null;
  isVip: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RegisterTournamentDialog: React.FC<Props> = ({
  open,
  tournamentId,
  isVip,
  onClose,
  onSuccess,
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setTeamId('');
    (async () => {
      try {
        const [teamsList, sub] = await Promise.all([
          clientApi.getTeams(),
          clientApi.getMySubscription(),
        ]);
        const leaderTeams = teamsList.filter((t) => t.is_leader);
        setTeams(leaderTeams);
        if (leaderTeams.length === 1) setTeamId(leaderTeams[0].id);
        setHasSubscription(!!sub?.is_active);
      } catch {
        setTeams([]);
      }
    })();
  }, [open]);

  const handleSubmit = async () => {
    if (!tournamentId) return;
    if (isVip && !hasSubscription) {
      setError('Для VIP-турнира нужна активная подписка');
      return;
    }
    if (teams.length > 0 && !teamId) {
      setError('Выберите команду');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await clientApi.registerTournament({
        tournament_id: tournamentId,
        team_id: teamId || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка регистрации';
      setError(msg.replace(/^"|"$/g, ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Регистрация на турнир</DialogTitle>
      <DialogContent>
        {isVip && !hasSubscription && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            VIP-турнир доступен только пользователям с активной подпиской
          </Alert>
        )}
        {teams.length > 0 ? (
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Команда</InputLabel>
            <Select
              value={teamId}
              label="Команда"
              onChange={(e) => setTeamId(e.target.value)}
            >
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Alert severity="info" sx={{ mt: 1 }}>
            Создайте команду во вкладке «Друзья», чтобы участвовать от имени команды
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || (isVip && !hasSubscription) || (teams.length > 0 && !teamId)}
        >
          {loading ? <CircularProgress size={22} /> : 'Отправить заявку'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RegisterTournamentDialog;
