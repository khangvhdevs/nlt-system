import { supabase } from '../index.js';

/**
 * Ghi log vi phạm rate limit
 * @param {Object} log
 * @param {string} log.email
 * @param {string} log.ip_address
 * @param {string} log.user_agent
 * @param {string} log.reason
 */
export async function createSpamLog({ email, ip_address, user_agent, reason }) {
  return await supabase.from('spam_logs').insert([
    { email, ip_address, user_agent, reason }
  ]);
}

/**
 * Đếm số lần người dùng bị rate-limit
 * @param {string} email
 * @returns {Promise<number>} số lần bị chặn
 */
export async function getRateLimitCount(email) {
  const { count } = await supabase
    .from('spam_logs')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('reason', 'rate-limit');

  return count ?? 0;
}
