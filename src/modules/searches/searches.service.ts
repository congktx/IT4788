import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedSearch } from './entities/saved_search.entity';

@Injectable()
export class SearchesService {
  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearchRepository: Repository<SavedSearch>,
  ) {}

  async saveSearch(userId: number, keyword: string) {
    const saved = this.savedSearchRepository.create({
      user_id: userId,
      keyword,
    });

    return await this.savedSearchRepository.save(saved);
  }

  async getListSavedSearch(userId: number, index: number, count: number) {
    return await this.savedSearchRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: index,
      take: count,
    });
  }
}