import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto/crypto.service';

/**
 * Global module for cross-cutting providers that any feature module may inject
 * without re-importing (CryptoService today; add shared helpers here).
 */
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CommonModule {}
