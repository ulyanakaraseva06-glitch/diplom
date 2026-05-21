import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tournamentsApi } from '../api/tournaments';
import { TournamentWithParticipants, Participant } from '../types';
import {
  Container, Typography, Box, Paper, Grid, Chip, Button, CircularProgress, Alert, Divider, IconButton, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GroupsIcon from '@mui/icons-material/Groups';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';


interface Match {
  id: string;
  team1Id: number | null;
  team2Id: number | null;
  winnerId: number | null;
  nextMatchId?: string;
  round: number;
  position: number;
}

const TournamentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManageTournaments, isOrganizer } = useAuth();
  const [tournament, setTournament] = useState<TournamentWithParticipants | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<{ name: string; matches: Match[] }[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [champion, setChampion] = useState<Participant | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTournament = async () => {
      try {
        setLoading(true);
        const response = await tournamentsApi.getDetailsWithParticipants(Number(id));
        const data = response.data;
        setTournament(data);
        setParticipants(data.participants || []);
        
        const saved = await loadSavedBracket();
        if (!saved) {
          generateBracket(data.participants || []);
        }
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Ошибка загрузки турнира');
      } finally {
        setLoading(false);
      }
    };
    if (id) loadTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- перезагрузка только при смене id турнира
  }, [id]);

  const getParticipantById = (participantId: number | null): Participant | null => {
    if (!participantId) return null;
    return participants.find(p => p.id === participantId) || null;
  };

  const generateBracket = (participantList: Participant[]) => {
    const shuffled = [...participantList];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const size = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
    const totalRounds = Math.log2(size);
    
    const slots: (Participant | null)[] = [...shuffled];
    while (slots.length < size) slots.push(null);
    
    let currentMatches: Match[] = [];
    for (let i = 0; i < slots.length; i += 2) {
      currentMatches.push({
        id: `r1_${i/2}`,
        team1Id: slots[i]?.id || null,
        team2Id: slots[i+1]?.id || null,
        winnerId: null,
        round: 1,
        position: i/2,
      });
    }
    
    const allRounds: Match[][] = [currentMatches];
    
    for (let round = 1; round < totalRounds; round++) {
      const prevMatches = allRounds[round - 1];
      const nextMatches: Match[] = [];
      
      for (let i = 0; i < prevMatches.length; i += 2) {
        const matchId = `r${round+1}_${i/2}`;
        const leftMatch = prevMatches[i];
        const rightMatch = prevMatches[i+1];
        
        if (leftMatch) leftMatch.nextMatchId = matchId;
        if (rightMatch) rightMatch.nextMatchId = matchId;
        
        nextMatches.push({
          id: matchId,
          team1Id: null,
          team2Id: null,
          winnerId: null,
          round: round + 1,
          position: i/2,
        });
      }
      allRounds.push(nextMatches);
    }
    
    const allMatches = allRounds.flat();
    setMatches(allMatches);
    
    const groupedRounds = allRounds.map((round, idx) => ({
      name: getRoundName(idx, totalRounds),
      matches: round,
    }));
    setRounds(groupedRounds);
    setChampion(null);
  };
  
  const getRoundName = (roundIndex: number, totalRounds: number): string => {
    const roundNum = roundIndex + 1;
    const lastRound = totalRounds;
    if (roundNum === lastRound) return 'Финал';
    if (roundNum === lastRound - 1) return 'Полуфинал';
    if (roundNum === lastRound - 2) return 'Четвертьфинал';
    if (roundNum === lastRound - 3) return '1/8 финала';
    return `${roundNum}-й раунд`;
  };
  
  // Сохранение в БД
  const saveToDatabase = async (currentMatches: Match[], currentChampion: Participant | null) => {
    if (!id || saving) return;
    
    setSaving(true);
    const matchesData = currentMatches.map(m => ({
      id: m.id,
      team1Id: m.team1Id,
      team2Id: m.team2Id,
      winnerId: m.winnerId,
      nextMatchId: m.nextMatchId || '',
      round: m.round,
      position: m.position,
    }));
    
    try {
      await tournamentsApi.saveBracket(Number(id), {
        matches: matchesData,
        championId: currentChampion?.id || null,
      });
    } catch (err) {
      console.error('Failed to save bracket:', err);
    } finally {
      setSaving(false);
    }
  };
  
  // Загрузка сохранённой сетки из БД
  const loadSavedBracket = async (): Promise<boolean> => {
    if (!id) return false;
    
    try {
      const response = await tournamentsApi.getBracket(Number(id));
      const { matches: savedMatches, championId } = response.data;
      
      if (savedMatches && savedMatches.length > 0) {
        const loadedMatches = savedMatches as Match[];
        setMatches(loadedMatches);
        
        if (championId) {
          const championTeam = participants.find(p => p.id === championId);
          if (championTeam) setChampion(championTeam);
        }
        
        // Обновляем отображение раундов
        const allRounds: Match[][] = [];
        const maxRound = Math.max(...loadedMatches.map(m => m.round));
        
        for (let r = 1; r <= maxRound; r++) {
          const roundMatches = loadedMatches.filter(m => m.round === r).sort((a, b) => a.position - b.position);
          allRounds.push(roundMatches);
        }
        
        const groupedRounds = allRounds.map((round, idx) => ({
          name: getRoundName(idx, maxRound),
          matches: round,
        }));
        setRounds(groupedRounds);
        return true;
      }
    } catch (err) {
      console.error('Failed to load saved bracket:', err);
    }
    return false;
  };
  
  // Сохраняем при изменениях
  useEffect(() => {
    if (matches.length > 0 && id && !loading && !saving) {
      const timer = setTimeout(() => {
        saveToDatabase(matches, champion);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- отложенное сохранение без лишних перезапусков
  }, [matches, champion, id, loading]);
  // Проверка: можно ли добавить команду в следующий раунд
const canAddToNextRound = (matchId: string, teamId: number): boolean => {
  // Находим текущий матч
  const currentMatch = matches.find(m => m.id === matchId);
  if (!currentMatch) return false;
  
  // Правило 1: Из одного матча может выйти только один победитель
  if (currentMatch.winnerId !== null && currentMatch.winnerId !== teamId) {
    alert('❌ Из этого матча победитель уже выбран!');
    return false;
  }
  
  // Правило 2: Нельзя добавить одну и ту же команду дважды в следующий раунд
  const allNextRoundMatches = matches.filter(m => m.round === currentMatch.round + 1);
  for (const match of allNextRoundMatches) {
    if (match.team1Id === teamId || match.team2Id === teamId) {
      alert('❌ Эта команда уже есть в следующем раунде!');
      return false;
    }
  }
  
  // Правило 3: Нельзя добавить обе команды из одного матча
  const otherTeamId = currentMatch.team1Id === teamId ? currentMatch.team2Id : currentMatch.team1Id;
  if (otherTeamId !== null && currentMatch.winnerId === otherTeamId) {
    alert('❌ Из этого матча уже выбран другой победитель!');
    return false;
  }
  
  return true;
};
  // Копирование команды в самый первый свободный слот следующего раунда (исходная ячейка не стирается)
  // Копирование команды в самый первый свободный слот следующего раунда
const copyTeamToNextRoundTop = (matchId: string, teamId: number) => {
  if (!isEditMode) return;
  
  // Проверяем, можно ли добавить команду
  if (!canAddToNextRound(matchId, teamId)) return;
  
  setMatches(prevMatches => {
    const newMatches = [...prevMatches];
    
    // Находим текущий матч
    const currentMatchIndex = newMatches.findIndex(m => m.id === matchId);
    if (currentMatchIndex === -1) return prevMatches;
    const currentMatch = { ...newMatches[currentMatchIndex] };
    
    // Помечаем победителя
    currentMatch.winnerId = teamId;
    newMatches[currentMatchIndex] = currentMatch;
    
    // Находим следующий раунд
    const nextMatchId = currentMatch.nextMatchId;
    if (!nextMatchId) {
      // Это финал - назначаем чемпиона
      const championTeam = getParticipantById(teamId);
      if (championTeam) setChampion(championTeam);
      updateAllRounds(newMatches);
      return newMatches;
    }
    
    // Находим все матчи следующего раунда
    const nextRoundMatches = newMatches.filter(m => m.round === currentMatch.round + 1);
    if (nextRoundMatches.length === 0) return prevMatches;
    
    // Ищем первый свободный слот
    let targetMatchIndex = -1;
    let targetSlot: 'team1Id' | 'team2Id' | null = null;
    
    // Сортируем матчи по позиции для правильного порядка
    const sortedMatches = [...nextRoundMatches].sort((a, b) => a.position - b.position);
    
    for (const match of sortedMatches) {
      const idx = newMatches.findIndex(m => m.id === match.id);
      if (match.team1Id === null) {
        targetMatchIndex = idx;
        targetSlot = 'team1Id';
        break;
      }
      if (match.team2Id === null) {
        targetMatchIndex = idx;
        targetSlot = 'team2Id';
        break;
      }
    }
    
    if (targetMatchIndex !== -1 && targetSlot !== null) {
      const targetMatch = { ...newMatches[targetMatchIndex] };
      targetMatch[targetSlot] = teamId;
      newMatches[targetMatchIndex] = targetMatch;
    }
    
    updateAllRounds(newMatches);
    return newMatches;
  });
};
  // Очистка ячейки - удаляем команду и сбрасываем все связанные победители
// Очистка ячейки - удаляем команду и сбрасываем все связанные победители
// Очистка ячейки - удаляем команду из указанного матча и сбрасываем только связанные с ней победы
const clearCell = (matchId: string, slot: 'team1Id' | 'team2Id') => {
  if (!isEditMode) return;
  
  setMatches(prevMatches => {
    const newMatches = [...prevMatches];
    const matchIndex = newMatches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return prevMatches;
    const match = { ...newMatches[matchIndex] };
    
    const removedTeamId = match[slot];
    match[slot] = null;
    
    // Если эта команда была победителем в этом матче, сбрасываем победителя
    if (match.winnerId === removedTeamId) {
      match.winnerId = null;
    }
    
    newMatches[matchIndex] = match;
    
    // Теперь удаляем эту команду ТОЛЬКО из следующих раундов (куда она прошла как победитель)
    // НЕ трогаем предыдущие раунды
    let nextMatchId = match.nextMatchId;
    while (nextMatchId) {
      const targetMatchId = nextMatchId;
      const nextMatchIndex = newMatches.findIndex((m) => m.id === targetMatchId);
      if (nextMatchIndex === -1) break;
      
      const nextMatch = { ...newMatches[nextMatchIndex] };
      let changed = false;
      
      // Удаляем команду из слотов следующего матча
      if (nextMatch.team1Id === removedTeamId) {
        nextMatch.team1Id = null;
        changed = true;
      }
      if (nextMatch.team2Id === removedTeamId) {
        nextMatch.team2Id = null;
        changed = true;
      }
      if (nextMatch.winnerId === removedTeamId) {
        nextMatch.winnerId = null;
        changed = true;
      }
      
      if (changed) {
        newMatches[nextMatchIndex] = nextMatch;
      }
      
      nextMatchId = nextMatch.nextMatchId;
    }
    
    // Сбрасываем чемпиона, если это он
    if (champion?.id === removedTeamId) {
      setChampion(null);
    }
    
    updateAllRounds(newMatches);
    return newMatches;
  });
};
// Сброс победителя в матче (команды остаются на месте)
const resetWinner = (matchId: string) => {
  if (!isEditMode) return;
  
  setMatches(prevMatches => {
    const newMatches = [...prevMatches];
    const matchIndex = newMatches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return prevMatches;
    const match = { ...newMatches[matchIndex] };
    const oldWinnerId = match.winnerId;
    
    match.winnerId = null;
    newMatches[matchIndex] = match;
    
    // Удаляем этого победителя из следующих раундов
    let nextMatchId = match.nextMatchId;
    while (nextMatchId) {
      const targetMatchId = nextMatchId;
      const nextMatchIndex = newMatches.findIndex((m) => m.id === targetMatchId);
      if (nextMatchIndex === -1) break;
      
      const nextMatch = { ...newMatches[nextMatchIndex] };
      let changed = false;
      
      if (nextMatch.team1Id === oldWinnerId) {
        nextMatch.team1Id = null;
        changed = true;
      }
      if (nextMatch.team2Id === oldWinnerId) {
        nextMatch.team2Id = null;
        changed = true;
      }
      if (nextMatch.winnerId === oldWinnerId) {
        nextMatch.winnerId = null;
        changed = true;
      }
      
      if (changed) {
        newMatches[nextMatchIndex] = nextMatch;
      }
      
      nextMatchId = nextMatch.nextMatchId;
    }
    
    if (champion?.id === oldWinnerId) {
      setChampion(null);
    }
    
    updateAllRounds(newMatches);
    return newMatches;
  });
};
// Сброс всех результатов турнира

  const updateAllRounds = (allMatches: Match[]) => {
    const newRounds = rounds.map(round => ({
      name: round.name,
      matches: round.matches.map(match => {
        const updated = allMatches.find(m => m.id === match.id);
        return updated || match;
      }),
    }));
    setRounds(newRounds);
  };
  
  const handleShuffle = () => {
    if (tournament) {
      generateBracket(tournament.participants || []);
      setChampion(null);
    }
  };
  
  const handleManualSave = () => {
    saveToDatabase(matches, champion);
    alert('Сетка сохранена!');
  };
  
  const toggleEditMode = () => setIsEditMode(!isEditMode);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error || !tournament) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>{error || 'Турнир не найден'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tournaments')} sx={{ mt: 2 }}>
          Назад к турнирам
        </Button>
      </Container>
    );
  }

  const renderMatch = (match: Match) => {
  const team1 = getParticipantById(match.team1Id);
  const team2 = getParticipantById(match.team2Id);
  const winner = getParticipantById(match.winnerId);
  const showDeleteButton = match.round > 1 && isEditMode;
  // Кнопка сброса победителя доступна ВСЕГДА, если есть победитель
  const showResetWinnerButton = isEditMode && match.winnerId !== null;
  
  return (
    <Paper key={match.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      {/* Team 1 */}
      <Box
        onClick={() => isEditMode && match.team1Id && copyTeamToNextRoundTop(match.id, match.team1Id)}
        sx={{
          p: 1, mb: 1, borderRadius: 1,
          cursor: isEditMode && match.team1Id ? 'pointer' : 'default',
          bgcolor: winner?.id === match.team1Id ? '#c8e6c9' : '#f5f5f5',
          '&:hover': isEditMode && match.team1Id ? { bgcolor: '#e0e0e0' } : {},
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <Typography variant="body2">{team1?.team_name || '—'}</Typography>
        {showDeleteButton && match.team1Id && (
          <Tooltip title="Удалить команду">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); clearCell(match.id, 'team1Id'); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      <Typography variant="caption" display="block" align="center" sx={{ my: 0.5 }}>VS</Typography>
      
      {/* Team 2 */}
      <Box
        onClick={() => isEditMode && match.team2Id && copyTeamToNextRoundTop(match.id, match.team2Id)}
        sx={{
          p: 1, borderRadius: 1,
          cursor: isEditMode && match.team2Id ? 'pointer' : 'default',
          bgcolor: winner?.id === match.team2Id ? '#c8e6c9' : '#f5f5f5',
          '&:hover': isEditMode && match.team2Id ? { bgcolor: '#e0e0e0' } : {},
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <Typography variant="body2">{team2?.team_name || '—'}</Typography>
        {showDeleteButton && match.team2Id && (
          <Tooltip title="Удалить команду">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); clearCell(match.id, 'team2Id'); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      {/* Кнопка сброса победителя (ВО ВСЕХ РАУНДАХ) */}
      {showResetWinnerButton && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Tooltip title="Сбросить победителя">
            <IconButton size="small" color="warning" onClick={() => resetWinner(match.id)}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Paper>
  );
};
  
  return (
  <Container maxWidth="xl">
    <Box sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(isOrganizer ? '/my-tournaments' : '/tournaments')}
        >
          {isOrganizer ? 'Назад к моим турнирам' : 'Назад к турнирам'}
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {canManageTournaments && (
            <Button 
              variant="outlined" 
              startIcon={<SaveIcon />} 
              onClick={handleManualSave}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить сетку'}
            </Button>
          )}
          {canManageTournaments && (
            <Button variant={isEditMode ? "contained" : "outlined"} startIcon={<EditIcon />} onClick={toggleEditMode} color={isEditMode ? "success" : "primary"}>
              {isEditMode ? "Режим редактирования (Вкл)" : "Включить режим редактирования"}
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>{tournament.title}</Typography>
        <Chip label={tournament.status === 'pending' ? 'Ожидает' : 'Одобрен'} color={tournament.status === 'pending' ? 'warning' : 'success'} sx={{ mb: 2 }} />
        
        {tournament.banner_url && (
    <Box
      component="img"
      src={`http://localhost:8080${tournament.banner_url}`}
      alt={tournament.title}
      sx={{
        width: '100%',
        maxHeight: 300,
        objectFit: 'cover',
        borderRadius: 2,
        mb: 2,
      }}
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        img.style.display = 'none';
      }}
    />
  )}
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box display="flex" alignItems="center" gap={1}><EmojiEventsIcon color="primary" /><Typography><strong>Игра:</strong> {tournament.game}</Typography></Box>
            <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}><CalendarTodayIcon color="action" /><Typography><strong>Дата начала:</strong> {new Date(tournament.start_date).toLocaleString()}</Typography></Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box display="flex" alignItems="center" gap={1}><AttachMoneyIcon color="success" /><Typography><strong>Призовой фонд:</strong> {tournament.prize_pool.toLocaleString()} ₽</Typography></Box>
            <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}><GroupsIcon color="info" /><Typography><strong>Участников:</strong> {tournament.participants?.length || 0} / {tournament.max_teams}</Typography></Box>
          </Grid>
        </Grid>
        {tournament.description && (<><Divider sx={{ my: 2 }} /><Typography><strong>Описание:</strong></Typography><Typography color="text.secondary">{tournament.description}</Typography></>)}
        
        {champion && (
          <Alert severity="success" sx={{ mt: 2 }} icon={<EmojiEventsIcon />}>
            <strong>Чемпион турнира: {champion.team_name}!</strong>
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5">Сетка турнира {isEditMode && <Chip label="Режим редактирования активен" size="small" color="success" sx={{ ml: 2 }} />}</Typography>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleShuffle}>Сбросить</Button>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 4, overflowX: 'auto', pb: 2 }}>
          {rounds.map((round) => (
            <Box key={round.name} sx={{ minWidth: 240 }}>
              <Typography variant="h6" align="center" gutterBottom>{round.name}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {round.matches.map(match => renderMatch(match))}
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  </Container>
);
};

export default TournamentDetails;