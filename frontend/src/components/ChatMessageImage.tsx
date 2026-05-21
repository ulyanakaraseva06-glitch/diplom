import React, { useState } from 'react';
import { Box, Dialog, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { mediaUrl } from '../utils/media';
import { chatImageSx } from '../utils/chatStyles';

export interface ChatMessageImageProps {
  imageUrl: string;
  fromMe?: boolean;
  hasText?: boolean;
  alt?: string;
}

const ChatMessageImage: React.FC<ChatMessageImageProps> = ({
  imageUrl,
  fromMe = false,
  hasText = false,
  alt = 'вложение',
}) => {
  const [open, setOpen] = useState(false);
  const src = mediaUrl(imageUrl);

  return (
    <>
      <Tooltip title="Открыть в полном размере">
        <Box
          component="img"
          src={src}
          alt={alt}
          onClick={() => setOpen(true)}
          sx={{
            ...chatImageSx(fromMe, hasText),
            cursor: 'pointer',
            transition: 'opacity 0.15s',
            '&:hover': { opacity: 0.85 },
          }}
        />
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'rgba(0, 0, 0, 0.92)',
              boxShadow: 'none',
              overflow: 'hidden',
              maxWidth: '95vw',
              maxHeight: '95vh',
              m: 1,
              p: 0,
            },
          },
        }}
        onClick={() => setOpen(false)}
      >
        <IconButton
          onClick={() => setOpen(false)}
          aria-label="Закрыть"
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'common.white',
            zIndex: 1,
            bgcolor: 'rgba(0,0,0,0.4)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={src}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          sx={{
            display: 'block',
            maxWidth: 'min(90vw, 1200px)',
            maxHeight: 'min(90vh, 900px)',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </Dialog>
    </>
  );
};

export default ChatMessageImage;
