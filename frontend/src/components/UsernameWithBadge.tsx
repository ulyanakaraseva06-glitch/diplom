import React from 'react';
import { Box, Typography, TypographyProps } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';

type Props = {
  username: string;
  hasSubscription?: boolean;
  variant?: TypographyProps['variant'];
  fontWeight?: TypographyProps['fontWeight'];
  component?: React.ElementType;
};

/** Никнейм со значком молнии у подписчиков (справа). */
const UsernameWithBadge: React.FC<Props> = ({
  username,
  hasSubscription,
  variant,
  fontWeight,
  component = 'span',
}) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.35,
      maxWidth: '100%',
    }}
  >
    <Typography
      component={component}
      variant={variant}
      fontWeight={fontWeight}
      noWrap
      sx={{ display: 'inline' }}
    >
      {username}
    </Typography>
    {hasSubscription && (
      <BoltIcon
        sx={{
          fontSize: variant === 'h6' ? 22 : variant === 'body1' ? 20 : 16,
          color: '#FFC107',
          flexShrink: 0,
        }}
        titleAccess="Активная подписка"
      />
    )}
  </Box>
);

export default UsernameWithBadge;
