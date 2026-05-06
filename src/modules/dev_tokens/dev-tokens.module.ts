import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevToken } from './entities/dev-token.entity';
import { DevTokensService } from './dev-tokens.service';
import { DevTokensController } from './dev-tokens.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DevToken]),
  ],
  providers: [DevTokensService],
  controllers: [DevTokensController],
  exports: [DevTokensService],
})
export class DevTokensModule { }
