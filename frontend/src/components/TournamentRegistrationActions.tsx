import React from 'react';
import { Box, Button, Chip } from '@mui/material';
import { MyRegistration } from '../api/clientApi';
import {
  myRegForTournament,
  registrationChipColor,
  registrationStatusLabel,
} from '../utils/tournamentHelpers';
import { confirmDelete } from '../utils/confirmDelete';

type Props = {
  tournamentId: number;
  myRegs: MyRegistration[];
  canRegister: boolean;
  onRegister: () => void;
  onCancelReg: (regId: number) => void;
  size?: 'small' | 'medium';
  showRegisterButton?: boolean;
};

const TournamentRegistrationActions: React.FC<Props> = ({
  tournamentId,
  myRegs,
  canRegister,
  onRegister,
  onCancelReg,
  size = 'small',
  showRegisterButton = true,
}) => {
  const reg = myRegForTournament(myRegs, tournamentId);

  if (reg) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Chip
          label={registrationStatusLabel(reg.status)}
          color={registrationChipColor(reg.status)}
          size={size === 'small' ? 'small' : 'medium'}
        />
        {reg.status === 'pending' && (
          <Button
            size={size}
            color="error"
            onClick={() => {
              if (confirmDelete()) onCancelReg(reg.id);
            }}
          >
            Отменить заявку
          </Button>
        )}
      </Box>
    );
  }

  if (canRegister && showRegisterButton) {
    return (
      <Button size={size} variant="contained" onClick={onRegister}>
        Зарегистрироваться
      </Button>
    );
  }

  return null;
};

export default TournamentRegistrationActions;
