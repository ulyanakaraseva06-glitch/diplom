import React from 'react';
import { Navigate } from 'react-router-dom';
import { Container } from '@mui/material';
import NavBar from '../components/NavBar';
import TournamentApplicationsPanel from '../components/TournamentApplicationsPanel';
import { useAuth } from '../contexts/AuthContext';

/** Заявки организатора (менеджер — через админ-панель /registrations) */
const TournamentApplications: React.FC = () => {
  const { isManager, isOrganizer } = useAuth();

  if (isManager) {
    return <Navigate to="/registrations" replace />;
  }

  if (!isOrganizer) {
    return <Navigate to="/client/tournaments" replace />;
  }

  return (
    <>
      <NavBar />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <TournamentApplicationsPanel title="Заявки на мои турниры" showOrganizerColumn={false} />
      </Container>
    </>
  );
};

export default TournamentApplications;
