import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import type {
  AuthResult,
  LoginRequest,
  RegisterRequest,
} from './auth.types.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a user account',
    description:
      'Creates a new user account using a unique email and password. The password is hashed before storage, and the response includes a bearer access token so the client can immediately call secured movie endpoints.',
  })
  @ApiBody({
    schema: {
      example: {
        email: 'mariem@example.com',
        password: 'strong-password',
      },
    },
  })
  @ApiCreatedResponse({
    description: 'User registered and JWT access token returned.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: 1,
          email: 'mariem@example.com',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Email or password does not meet validation rules.',
  })
  @ApiConflictResponse({ description: 'Email is already registered.' })
  register(@Body() request: RegisterRequest): Promise<AuthResult> {
    return this.authService.register(request);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login and receive a JWT access token',
    description:
      "Verifies the user's email and password. On success, returns a bearer access token that should be sent as Authorization: Bearer <token> when calling secured endpoints.",
  })
  @ApiBody({
    schema: {
      example: {
        email: 'mariem@example.com',
        password: 'strong-password',
      },
    },
  })
  @ApiOkResponse({
    description: 'JWT access token returned.',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: 1,
          email: 'mariem@example.com',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email is invalid.' })
  @ApiNotFoundResponse({ description: 'User does not exist.' })
  @ApiUnauthorizedResponse({ description: 'Password is invalid.' })
  login(@Body() request: LoginRequest): Promise<AuthResult> {
    return this.authService.login(request);
  }
}
