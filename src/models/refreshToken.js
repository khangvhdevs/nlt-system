import { supabase } from '../index.js';

export class RefreshToken {
  // Danh sách các field hợp lệ trong bảng refresh_tokens
  static fields = [
    'id',
    'user_id',
    'token',
    'user_agent',
    'ip_address',
    'expires_at',
    'created_at'
  ];

  /**
   * Tạo refresh token mới
   * @param {Object} tokenData - Dữ liệu token
   * @param {string} tokenData.user_id - ID người dùng
   * @param {string} tokenData.token - Chuỗi refresh token
   * @param {string} [tokenData.user_agent] - Thông tin trình duyệt
   * @param {string} [tokenData.ip_address] - Địa chỉ IP
   * @param {string|Date} tokenData.expires_at - Thời gian hết hạn
   * @returns {Promise<Object>} Refresh token vừa tạo
   */
  static async create(tokenData) {
    const validData = RefreshToken.pickValidFields(tokenData, [
      'user_id',
      'token',
      'user_agent',
      'ip_address',
      'expires_at'
    ]);

    const { data, error } = await supabase
      .from('refresh_tokens')
      .insert([validData])
      .select(RefreshToken.fields.join(','))
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Tìm token trong bảng theo chuỗi token
   * @param {string} token - Chuỗi token cần tìm
   * @returns {Promise<Object>} Token tìm được
   */
  static async findByToken(token) {
    const { data, error } = await supabase
      .from('refresh_tokens')
      .select(RefreshToken.fields.join(','))
      .eq('token', token)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Xóa refresh token theo id
   * @param {string} id - ID của token cần xóa
   * @returns {Promise<boolean>} Trả về true nếu xóa thành công
   */
  static async deleteById(id) {
    const { error } = await supabase
      .from('refresh_tokens')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }

  /**
   * Xóa toàn bộ refresh token của một user
   * @param {string} user_id - ID người dùng
   * @returns {Promise<boolean>} Trả về true nếu xóa thành công
   */
  static async deleteByUserId(user_id) {
    const { error } = await supabase
      .from('refresh_tokens')
      .delete()
      .eq('user_id', user_id);
    if (error) throw error;
    return true;
  }

  /**
   * Chỉ lấy các trường hợp lệ từ dữ liệu đầu vào
   * @param {Object} data - Dữ liệu gốc
   * @param {Array<string>} allowedFields - Danh sách field cho phép
   * @returns {Object} Dữ liệu đã lọc
   */
  static pickValidFields(data, allowedFields) {
    return Object.fromEntries(
      Object.entries(data).filter(([key]) => allowedFields.includes(key))
    );
  }
}
