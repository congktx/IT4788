import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rate } from './entities/rate.entity';
import { User } from '../users/entities/user.entity';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rate, User])],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService],
})
export class RatesModule {}