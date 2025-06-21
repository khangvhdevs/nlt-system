/**
 * Middleware to check if the user has required role(s)
 * @param {...string} allowedRoles - List of allowed roles
 * @returns {Function} Express middleware
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized - User not authenticated',
          message: 'You must be logged in to access this resource.'
        });
      }

      const hasRole = allowedRoles.includes(req.user.role);
      
      if (!hasRole) {
        return res.status(403).json({
          error: 'Forbidden - Insufficient permissions',
          message: `User role '${req.user.role}' is not allowed to access this resource. Required roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.'
      });
    }
  };
};
