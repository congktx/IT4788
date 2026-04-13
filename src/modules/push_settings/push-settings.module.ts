import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PushSetting } from './entities/push-setting.entity';
import { PushSettingsService } from './push-settings.service';
import { PushSettingsController } from './push-settings.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PushSetting]),
    UsersModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d') as any,
        },
      }),
    }),
  ],
  providers: [PushSettingsService],
  controllers: [PushSettingsController],
  exports: [PushSettingsService],
})
export class PushSettingsModule {}