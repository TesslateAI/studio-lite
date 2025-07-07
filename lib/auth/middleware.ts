import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string | null;
    role: string;
    isGuest: boolean;
  };
}

export function requireAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const user = await getUser();
      
      if (!user) {
        console.warn('Unauthenticated API access attempt', {
          path: req.nextUrl.pathname,
          method: req.method,
          timestamp: new Date().toISOString(),
          userAgent: req.headers.get('user-agent')?.substring(0, 100)
        });
        
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Attach user to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isGuest: user.isGuest
      };

      return await handler(authenticatedReq);
    } catch (error) {
      console.error('Authentication middleware error', {
        path: req.nextUrl.pathname,
        method: req.method,
        timestamp: new Date().toISOString(),
        hasError: !!error
      });
      
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

export function requireRole(role: string) {
  return function (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
    return requireAuth(async (req: AuthenticatedRequest) => {
      if (!req.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      if (req.user.role !== role) {
        console.warn('Insufficient permissions', {
          path: req.nextUrl.pathname,
          method: req.method,
          userRole: req.user.role,
          requiredRole: role,
          userId: req.user.id,
          timestamp: new Date().toISOString()
        });
        
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return await handler(req);
    });
  };
}

export function requireNonGuest(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return requireAuth(async (req: AuthenticatedRequest) => {
    if (!req.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (req.user.isGuest) {
      console.warn('Guest user attempting protected action', {
        path: req.nextUrl.pathname,
        method: req.method,
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json(
        { error: 'Account upgrade required' },
        { status: 403 }
      );
    }

    return await handler(req);
  });
}