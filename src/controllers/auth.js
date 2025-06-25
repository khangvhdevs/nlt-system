import bcrypt from 'bcrypt';
import { supabase } from '../index.js';
import { User } from '../models/user.js';
import { generateAccessToken, generateRefreshToken, getExpirationTime } from '../utils/jwt.js';
import { RefreshToken } from '../models/refreshToken.js';
import { loginSchema } from '../validations/auth.schema.js';

// Validate email format
const validateEmail = (email) => {
  // General email format
  const generalEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return generalEmailRegex.test(email);
};

// Đăng ký tài khoản mới
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: username, email, and password are required' 
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create new user
    const userData = await User.create({
      username,
      email,
      password,
      role: 'user'
    });

    // Generate JWT token
    const token = generateToken(userData);

    // Remove password from response
    delete userData.password;

    return res.status(201).json({
      message: 'Registration successful',
      user: userData,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

// Đăng nhập
export const login = async (req, res) => {
  console.log("📩 Request body:", req.body);
  try {
    // Validate input using schema
    const parsedData = loginSchema.parse(req.body);
    const { email, password } = parsedData;

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      console.log("User not found error:", error);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email hoặc mật khẩu không chính xác' 
      });
    }

    // Ensure password and user.password are defined
    if (!password || !user.password) {
      console.log("Password missing error - password:", !!password, "user.password:", !!user.password);
      return res.status(400).json({ error: 'Mật khẩu không được cung cấp' });
    }

    try {
      // Compare password with hashed password in database
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          message: 'Email hoặc mật khẩu không chính xác'
        });
      }
    } catch (bcryptError) {
      console.error("bcrypt error:", bcryptError);
      return res.status(500).json({ error: 'Lỗi xác thực mật khẩu' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to database
    await RefreshToken.create({
      user_id: user.id,
      token: refreshToken,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
      expires_at: getExpirationTime(7) // 7 days
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    // Create user response object without sensitive information
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: userResponse
    });

  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

// Thay đổi mật khẩu
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    // Lấy thông tin người dùng từ token (đã được xác thực bởi middleware)
    if (!req.user || !req.user.id) {
      console.error('User not authenticated or missing user ID');
      return res.status(401).json({ error: 'Vui lòng đăng nhập trước khi thực hiện thao tác này' });
    }
    
    const userId = req.user.id;

    // Log để debug
    console.log("User ID from token:", userId);

    // Lấy người dùng từ cơ sở dữ liệu
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    // Kiểm tra mật khẩu cũ
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    
    if (!isOldPasswordValid) {
      return res.status(401).json({ 
        error: 'Mật khẩu cũ không chính xác'
      });
    }

    // Mã hóa mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu mới vào cơ sở dữ liệu
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedNewPassword })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Đã xảy ra lỗi, vui lòng thử lại sau' });
  }
};
