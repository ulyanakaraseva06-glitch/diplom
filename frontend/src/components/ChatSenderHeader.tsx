import React from 'react';
import { Avatar, Box, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { mediaUrl } from '../utils/media';

export interface ChatSenderHeaderProps {
  username: string;
  email?: string;
  avatarUrl?: string;
  align?: 'left' | 'right';
}

const ChatSenderHeader: React.FC<ChatSenderHeaderProps> = ({
  username,
  email,
  avatarUrl,
  align = 'left',
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: align === 'right' ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 1,
      mb: 0.75,
    }}
  >
    <Avatar
      src={avatarUrl ? mediaUrl(avatarUrl) : undefined}
      sx={{ width: 36, height: 36, flexShrink: 0 }}
    >
      <PersonIcon fontSize="small" />
    </Avatar>
    <Box sx={{ minWidth: 0, textAlign: align === 'right' ? 'right' : 'left' }}>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, lineHeight: 1.25, color: 'text.primary' }}
        noWrap
      >
        {username}
      </Typography>
      {email ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
          {email}
        </Typography>
      ) : null}
    </Box>
  </Box>
);

export default ChatSenderHeader;
