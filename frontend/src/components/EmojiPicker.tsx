import React from 'react';
import { Box, IconButton, Popover, Typography } from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😎', '🤔', '😢', '😡',
  '👍', '👎', '👏', '🙌', '🔥', '💯', '🎮', '🏆', '⚡', '❤️',
];

interface Props {
  onPick: (emoji: string) => void;
}

const EmojiPicker: React.FC<Props> = ({ onPick }) => {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        title="Вставить смайлик"
        size="small"
      >
        <EmojiEmotionsIcon />
      </IconButton>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, maxWidth: 280 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            Выберите смайлик
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {EMOJIS.map((e) => (
              <IconButton
                key={e}
                size="small"
                onClick={() => {
                  onPick(e);
                  setAnchor(null);
                }}
              >
                <span style={{ fontSize: 22 }}>{e}</span>
              </IconButton>
            ))}
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default EmojiPicker;
