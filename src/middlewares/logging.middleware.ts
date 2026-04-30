import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const log = {
      method: req.method,
      endpoint: req.originalUrl,
      status_code: res.statusCode,
      response_time: `${duration}ms`,
      timestamp: new Date().toISOString(),
      user_agent: req.get('User-Agent'),
      ip: req.ip
    };
    
    console.log(JSON.stringify(log));
  });
  
  next();
};
