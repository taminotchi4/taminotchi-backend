import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt'

@Injectable()
export class CryptoService {
  
  async encrypt(data: string): Promise<string> {
    return bcrypt.hash(data, 7);
  }

  async decrypt(data: string, encryptedData: string): Promise<boolean> {
    return bcrypt.compare(data, encryptedData);
  }
}
