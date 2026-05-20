import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiClient } from '../api/client';

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  event_type: 'tournament' | 'note' | 'task';
}

const EventCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    all_day: false,
    event_type: 'note' as 'note' | 'task',
  });
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/calendar/events');
      setEvents(response.data);
    } catch (err) {
      console.error('Ошибка загрузки событий:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDateClick = (arg: any) => {
  setEditingEvent(null);
  const dateStr = arg.dateStr;
  setSelectedDate(dateStr);  // добавить
  setFormData({
    title: '',
    description: '',
    start_date: `${dateStr}T12:00:00`,
    end_date: `${dateStr}T13:00:00`,
    all_day: true,
    event_type: 'note',
  });
  setOpenDialog(true);
};

  const handleEventClick = (arg: any) => {
    const event = events.find(e => e.id === parseInt(arg.event.id));
    if (event && event.event_type !== 'tournament') {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        start_date: event.start_date,
        end_date: event.end_date,
        all_day: event.all_day,
        event_type: event.event_type as 'note' | 'task',
      });
      setOpenDialog(true);
    } else if (event?.event_type === 'tournament') {
      alert(`Турнир: ${event.title}\nДата: ${new Date(event.start_date).toLocaleString()}`);
    }
  };

  const handleSubmit = async () => {
  if (!formData.title) {
    setError('Введите название');
    return;
  }

  try {
    const dataToSend = {
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    };

    if (editingEvent) {
      await apiClient.put(`/calendar/events/${editingEvent.id}`, dataToSend);
    } else {
      await apiClient.post('/calendar/events', dataToSend);
    }
    setOpenDialog(false);
    loadEvents();
    setError('');
  } catch (err) {
    setError('Ошибка сохранения');
  }
};

  const handleDelete = async () => {
    if (!editingEvent) return;
    if (!window.confirm('Удалить событие?')) return;

    try {
      await apiClient.delete(`/calendar/events/${editingEvent.id}`);
      setOpenDialog(false);
      loadEvents();
    } catch (err) {
      setError('Ошибка удаления');
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'tournament': return '#4caf50';
      case 'task': return '#ff9800';
      default: return '#2196f3';
    }
  };

  const calendarEvents = events.map(event => ({
    id: String(event.id),
    title: event.title,
    start: event.start_date,
    end: event.end_date,
    allDay: event.all_day,
    backgroundColor: getEventColor(event.event_type),
    borderColor: getEventColor(event.event_type),
  }));

  return (
    <Box sx={{ height: 500, mb: 4, position: 'relative' }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.6)',
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        📅 Календарь и планирование
        <Chip label="Турниры" size="small" sx={{ bgcolor: '#4caf50', color: 'white' }} />
        <Chip label="Задачи" size="small" sx={{ bgcolor: '#ff9800', color: 'white' }} />
        <Chip label="Заметки" size="small" sx={{ bgcolor: '#2196f3', color: 'white' }} />
      </Typography>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        initialView="dayGridMonth"
        editable={false}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={calendarEvents}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        locale="ru"
        buttonText={{
          today: 'Сегодня',
          month: 'Месяц',
          week: 'Неделя',
          day: 'День',
        }}
      />

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
  <DialogTitle>
    {editingEvent ? 'Редактировать событие' : `Новое событие на ${selectedDate}`}
  </DialogTitle>
  <DialogContent>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    
    <TextField
      fullWidth
      label="Название"
      value={formData.title}
      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
      margin="normal"
      required
    />
    
    <FormControl fullWidth margin="normal">
      <InputLabel>Тип события</InputLabel>
      <Select
        value={formData.event_type}
        label="Тип события"
        onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value as 'note' | 'task' }))}
      >
        <MenuItem value="note">📝 Заметка</MenuItem>
        <MenuItem value="task">✅ Задача</MenuItem>
      </Select>
    </FormControl>
    
    <TextField
      fullWidth
      label="Описание"
      value={formData.description}
      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
      margin="normal"
      multiline
      rows={3}
    />
    
    <TextField
      fullWidth
      label="Дата начала"
      type="datetime-local"
      value={formData.start_date}
      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
      margin="normal"
      InputLabelProps={{ shrink: true }}
    />
    
    <TextField
      fullWidth
      label="Дата окончания"
      type="datetime-local"
      value={formData.end_date}
      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
      margin="normal"
      InputLabelProps={{ shrink: true }}
    />
  </DialogContent>
  <DialogActions>
    {editingEvent && (
      <Button color="error" onClick={handleDelete} startIcon={<DeleteIcon />}>
        Удалить
      </Button>
    )}
    <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
    <Button variant="contained" onClick={handleSubmit}>
      {editingEvent ? 'Сохранить' : 'Создать'}
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
};

export default EventCalendar;