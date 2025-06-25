export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    } else {
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        message: 'Lỗi hệ thống khi kiểm tra dữ liệu'
      });
    }
  }
};
