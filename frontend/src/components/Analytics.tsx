import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
} from '@mui/material';
import { apiClient } from '../api/client';

interface AnalyticsData {
  tournamentsByMonth: { months: string[]; counts: number[] };
  tournamentsByStatus: Record<string, number>;
  registrationsTrend: { dates: string[]; counts: number[] };
  topOrganizers: { organizer_id: number; organizer_name: string; count: number }[];
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const [monthRes, statusRes, trendRes, topRes] = await Promise.all([
          apiClient.get('/analytics/tournaments-by-month'),
          apiClient.get('/analytics/tournaments-by-status'),
          apiClient.get('/analytics/registrations-trend'),
          apiClient.get('/analytics/top-organizers'),
        ]);

        setData({
          tournamentsByMonth: monthRes.data,
          tournamentsByStatus: statusRes.data,
          registrationsTrend: trendRes.data,
          topOrganizers: topRes.data,
        });
      } catch (err) {
        console.error('Ошибка загрузки аналитики:', err);
        setError('Не удалось загрузить аналитику');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  const statusList = Object.entries(data?.tournamentsByStatus || {}).map(([status, count]) => ({
    status: status === 'pending' ? 'Ожидает' :
            status === 'approved' ? 'Одобрен' :
            status === 'ongoing' ? 'Идет' :
            status === 'completed' ? 'Завершен' : 'Отменен',
    count,
  }));

  const totalStatus = statusList.reduce((sum, s) => sum + s.count, 0);
  const maxMonthCount = Math.max(...(data?.tournamentsByMonth.counts || [0]));
  const maxRegistrations = Math.max(...(data?.registrationsTrend.counts || [0]));
  const totalRegistrations = data?.registrationsTrend.counts.reduce((a, b) => a + b, 0) || 0;
  const avgRegistrations = Math.round(totalRegistrations / (data?.registrationsTrend.counts.length || 1));

  const getStatusColor = (status: string): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'Одобрен': return 'success';
      case 'Ожидает': return 'warning';
      case 'Отменен': return 'error';
      case 'Идет': return 'info';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        📊 Аналитика
      </Typography>

      <Grid container spacing={3}>
        {/* Турниры по месяцам */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Турниры по месяцам
            </Typography>
            <Box sx={{ mt: 2 }}>
              {data?.tournamentsByMonth.months.map((month, idx) => {
                const count = data.tournamentsByMonth.counts[idx];
                const percent = maxMonthCount > 0 ? (count / maxMonthCount) * 100 : 0;
                return (
                  <Box key={month} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{month}</Typography>
                      <Typography variant="body2" fontWeight="bold">{count}</Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 8,
                        bgcolor: 'grey.200',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${percent}%`,
                          height: '100%',
                          bgcolor: 'primary.main',
                          borderRadius: 4,
                          transition: 'width 0.5s',
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Статусы турниров */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Статусы турниров
            </Typography>
            <Box sx={{ mt: 2 }}>
              {statusList.map((item) => {
                const percent = totalStatus > 0 ? (item.count / totalStatus) * 100 : 0;
                const color = getStatusColor(item.status);
                return (
                  <Box key={item.status} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.status}</Typography>
                      <Typography variant="body2" fontWeight="bold">{item.count} ({percent.toFixed(0)}%)</Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 8,
                        bgcolor: 'grey.200',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${percent}%`,
                          height: '100%',
                          bgcolor: `${color}.main`,
                          borderRadius: 4,
                          transition: 'width 0.5s',
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Динамика регистраций */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Регистрации на турниры (последние 30 дней)
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Всего регистраций: {totalRegistrations} | В среднем в день: {avgRegistrations}
            </Typography>
            <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
              {data?.registrationsTrend.dates.map((date, idx) => {
                const count = data.registrationsTrend.counts[idx];
                const percent = maxRegistrations > 0 ? (count / maxRegistrations) * 100 : 0;
                return (
                  <Box key={date} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{date}</Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>{count}</Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 6,
                        bgcolor: 'grey.200',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${percent}%`,
                          height: '100%',
                          bgcolor: 'secondary.main',
                          borderRadius: 3,
                          transition: 'width 0.5s',
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Топ организаторов */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Топ организаторов
            </Typography>
            {data?.topOrganizers.length === 0 ? (
              <Typography color="text.secondary">Нет данных</Typography>
            ) : (
              <Box>
                {data?.topOrganizers.map((org, idx) => (
                  <Box
                    key={org.organizer_id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                      p: 1,
                      bgcolor: idx % 2 === 0 ? 'action.hover' : 'transparent',
                      borderRadius: 1,
                    }}
                  >
                    <Typography>
                      {idx + 1}. {org.organizer_name}
                    </Typography>
                    <Typography fontWeight="bold" color="primary">
                      {org.count} турниров
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;