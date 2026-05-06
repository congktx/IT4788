import { News } from './entities/news.entity';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GetListNewsDto } from './dto/get_list_news.dto';
import { APP_RESPONSE } from '../constants/response.constants';
@Injectable()
export class newsService {
  constructor(
    @InjectRepository(News)
    private newsRepo: Repository<News>,
  ) {}
  async getNews(id: number) {
    if (isNaN(Number(id))) return APP_RESPONSE.PARAMETER_TYPE_INVALID;
    const news = await this.newsRepo.findOne({
      where: { id: Number(id) },
    });
    if (!news) {
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
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
      const list_news = await this.newsRepo.find();
      return {
        code: '1000',
        message: 'OK',
        data: list_news,
      };
    }
    if (isNaN(Number(index)) || isNaN(Number(count))) {
      return APP_RESPONSE.PARAMETER_TYPE_INVALID;
    }
    if (Number(index) * Number(count))
      return APP_RESPONSE.PARAMETER_VALUE_INVALID;
    const [news, total] = await this.newsRepo.findAndCount({
      skip: Number(Number(index) * Number(count)),
      take: Number(count),
      order: { id: 'DESC' },
    });
    return {
      code: '1000',
      message: 'OK',
      data: {
        list_news: news,
        total: total,
      },
    };
  }
}
