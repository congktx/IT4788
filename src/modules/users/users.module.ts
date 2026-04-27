import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UserCode } from './entities/user_code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCode])],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule { }