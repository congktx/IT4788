import { RESPONSE_CODE } from '../products/constants';
import { News } from './entities/news.entity';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GetListNewsDto } from './dto/get_list_news.dto';
@Injectable()
export class newsService {
  constructor(
    @InjectRepository(News)
    private newsRepo: Repository<News>,
  ) {}
  async getNews(id: number) {
    const news = await this.newsRepo.findOne({
      where: { id: Number(id) },
    });
    if (!news) {
      return RESPONSE_CODE.PARAM_VALUE_INVALID;
    }
    return {
      code: '1000',
      message: 'OK',
      data: news,
    };
  }
  async getListNews(query: GetListNewsDto) {
    const { index, count } = query;
    if (index === null || count === null) {
      const listNews = await this.newsRepo.find();
      return {
        code: '1000',
        message: 'OK',
        data: listNews,
      };
    }
    const [news, total] = await this.newsRepo.findAndCount({
      skip: Number(index),
      take: Number(count),
      order: { id: 'DESC' },
    });
    return {
      code: '1000',
      message: 'OK',
      data: {
        listNews: news,
        total: total,
      },
    };
  }
}
