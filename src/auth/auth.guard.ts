import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from './auth.types.js';
import { TokenService } from './token.service.js';

interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (this.hasValidInternalToken(request)) {
      return true;
    }

    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    request.user = this.tokenService.verify(token);
    return true;
  }

  private hasValidInternalToken(request: AuthenticatedRequest): boolean {
    const configuredToken = this.config.get<string>('INTERNAL_SYNC_TOKEN');
    if (!configuredToken) return false;

    const receivedHeaderToken = getHeaderValue(
      request.headers['x-internal-sync-token'],
    );
    const receivedBearerToken = extractBearerToken(
      request.headers.authorization,
    );

    return (
      receivedHeaderToken === configuredToken ||
      receivedBearerToken === configuredToken
    );
  }
}

function extractBearerToken(
  header: string | string[] | undefined,
): string | null {
  const value = getHeaderValue(header);
  if (!value) return null;

  const [scheme, token] = value.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function getHeaderValue(header: string | string[] | undefined): string | null {
  if (Array.isArray(header)) return header[0] ?? null;
  return header ?? null;
}
