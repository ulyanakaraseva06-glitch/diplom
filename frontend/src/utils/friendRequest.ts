/** Сообщение об ошибке отправки заявки в друзья (текст ответа API). */
export function friendRequestErrorMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already friends')) return 'Этот пользователь уже у вас в друзьях';
  if (m.includes('incoming friend request')) {
    return 'Вам уже отправили заявку — примите её во вкладке «Заявки»';
  }
  if (m.includes('friend request already sent') || m.includes('request already exists')) {
    return 'Заявка уже отправлена';
  }
  if (m.includes('cannot add yourself')) return 'Нельзя добавить себя в друзья';
  if (m.includes('user not found')) return 'Пользователь не найден';
  return 'Ошибка отправки';
}

/** user_001, user_12 → числовой id. */
export function parseNeo4jUserId(userId: string): number | null {
  const m = /^user_(\d+)$/i.exec(userId.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
}
