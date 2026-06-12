import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { UserAccount } from './auth.types.js';

interface UserAccountRecord {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async createUser(email: string, passwordHash: string): Promise<UserAccount> {
    const result = await this.database.query<UserAccountRecord>(
      `
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email, password_hash, created_at, updated_at
      `,
      [email, passwordHash],
    );

    return mapUserAccountRecord(result.rows[0]);
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    const result = await this.database.query<UserAccountRecord>(
      `
        SELECT id, email, password_hash, created_at, updated_at
        FROM users
        WHERE email = $1
      `,
      [email],
    );
    const record = result.rows[0];

    return record ? mapUserAccountRecord(record) : null;
  }
}

function mapUserAccountRecord(record: UserAccountRecord): UserAccount {
  return {
    id: Number(record.id),
    email: record.email,
    passwordHash: record.password_hash,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
