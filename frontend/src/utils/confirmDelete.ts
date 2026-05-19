/** Единое подтверждение удаления/отмены */
export function confirmDelete(): boolean {
  return window.confirm('Вы уверены, что хотите удалить?');
}
