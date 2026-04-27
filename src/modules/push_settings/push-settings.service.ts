import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSetting } from './entities/push-setting.entity';

@Injectable()
export class PushSettingsService {
  constructor(
    @InjectRepository(PushSetting)
    private readonly pushSettingRepository: Repository<PushSetting>,
  ) {}

  async findByUserId(userId: number) {
    return this.pushSettingRepository.findOne({
      where: { user_id: userId },
    });
  }

  async createDefault(userId: number) {
    const setting = this.pushSettingRepository.create({
      user_id: userId,
      like: 1,
      comment: 1,
      transaction: 1,
      announcement: 1,
      sound_on: 1,
      sound_default: 'default',
    });

    return this.pushSettingRepository.save(setting);
  }

  async findOrCreateByUserId(userId: number) {
    let setting = await this.findByUserId(userId);

    if (!setting) {
      setting = await this.createDefault(userId);
    }

    return setting;
  }

  async updatePushSetting(
    userId: number,
    payload: {
      like?: string;
      comment?: string;
      transaction?: string;
      announcement?: string;
      sound_on?: string;
      sound_default?: string;
    },
  ) {
    const setting = await this.findOrCreateByUserId(userId);

    if (payload.like !== undefined) {
      setting.like = Number(payload.like);
    }

    if (payload.comment !== undefined) {
      setting.comment = Number(payload.comment);
    }

    if (payload.transaction !== undefined) {
      setting.transaction = Number(payload.transaction);
    }

    if (payload.announcement !== undefined) {
      setting.announcement = Number(payload.announcement);
    }

    if (payload.sound_on !== undefined) {
      setting.sound_on = Number(payload.sound_on);
    }

    if (payload.sound_default !== undefined) {
      setting.sound_default = payload.sound_default;
    }

    return this.pushSettingRepository.save(setting);
  }
}