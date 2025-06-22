import { verifyRefreshToken, generateAccessToken } from '../utils/jwt.js';
import { RefreshToken } from '../models/refreshToken.js';
import { supabase } from '../index.js';

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Check if token exists in DB and matches user_id
    const { data: tokenRecord, error } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('user_id', decoded.id)
      .eq('token', refreshToken)
      .single();

    if (error || !tokenRecord) {
      return res.status(403).json({ error: 'Refresh token not found or revoked' });
    }

    // Optionally: check expiry in DB (tokenRecord.expires_at)
    // Generate new access token
    const user = {
      id: decoded.id,
      email: tokenRecord.email, // You may need to fetch user for email/role if needed
      role: tokenRecord.role    // Or fetch from users table if not stored in tokenRecord
    };
    // For full user info, fetch from users table:
    // const { data: userData } = await supabase.from('users').select('*').eq('id', decoded.id).single();
    // ...

    const accessToken = generateAccessToken(user);
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
