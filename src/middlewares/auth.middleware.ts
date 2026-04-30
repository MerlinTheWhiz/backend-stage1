import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { UserService } from '../modules/user/user.service';
import { JWTPayload } from '../modules/user/user.types';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
      return;
    }

    const payload = JWTUtils.verifyAccessToken(token);
    const user = await UserService.findById(payload.userId);

    if (!user || !user.is_active) {
      res.status(403).json({
        status: 'error',
        message: 'User not found or inactive'
      });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireAnalyst = requireRole(['admin', 'analyst']);
