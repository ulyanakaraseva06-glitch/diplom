import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import TournamentApplicationsPanel from '../components/TournamentApplicationsPanel';
import { useAuth } from '../contexts/AuthContext';

const Registrations: React.FC = () => {
  const { isManager } = useAuth();
  const navigate = useNavigate();

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="outlined" startIcon={<HomeIcon />} onClick={() => navigate('/dashboard')}>
            В админ-панель
          </Button>
        </Box>
        <TournamentApplicationsPanel
          title="Модерация заявок на участие"
          showOrganizerColumn={isManager}
          defaultStatus="pending"
        />
      </Box>
    </Container>
  );
};

export default Registrations;
