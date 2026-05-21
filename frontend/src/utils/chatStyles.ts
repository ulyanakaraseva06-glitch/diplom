import { Theme } from '@mui/material/styles';
import { SxProps, SystemStyleObject } from '@mui/system';

type BubbleStyleFn = (theme: Theme) => SystemStyleObject<Theme>;

const bubbleTypography = {
  color: 'inherit',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  whiteSpace: 'pre-wrap',
} as const;

/** Стили пузыря сообщения: контрастный текст на любом фоне (light / dark / cyber). */
export function messageBubbleSx(fromMe: boolean): BubbleStyleFn {
  return (theme) => {
    const base = {
      p: 1.5,
      width: 'fit-content',
      maxWidth: '100%',
      minWidth: 56,
      boxSizing: 'border-box',
      overflow: 'hidden',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      '& .MuiTypography-root': bubbleTypography,
    };

    if (fromMe) {
      return {
        ...base,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      };
    }

    const isLight = theme.palette.mode === 'light';
    return {
      ...base,
      bgcolor: isLight ? theme.palette.grey[200] : theme.palette.grey[800],
      color: isLight ? theme.palette.text.primary : theme.palette.common.white,
      border: isLight ? 'none' : `1px solid ${theme.palette.grey[700]}`,
    };
  };
}

/** Обёртка колонки: ширина по содержимому пузыря, не по шапке отправителя. */
export const chatMessageColumnSx = (fromMe: boolean): SystemStyleObject<Theme> => ({
  maxWidth: '78%',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: fromMe ? 'flex-end' : 'flex-start',
  verticalAlign: 'top',
});

/** Вложение-картинка: свои сообщения компактнее. */
export function chatImageSx(fromMe: boolean, hasText = false): SxProps<Theme> {
  return {
    display: 'block',
    borderRadius: 1,
    mt: hasText ? 1 : 0,
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    ...(fromMe
      ? { maxWidth: 200, maxHeight: 160 }
      : { maxWidth: '100%', maxHeight: 280 }),
  };
}

/** Подпись времени / автора внутри пузыря. */
export function chatMetaSx(fromMe: boolean): SxProps<Theme> {
  return (theme) => ({
    opacity: 0.85,
    display: 'block',
    mt: 0.5,
    color: fromMe
      ? 'inherit'
      : theme.palette.mode === 'light'
        ? theme.palette.text.secondary
        : theme.palette.grey[400],
  });
}
