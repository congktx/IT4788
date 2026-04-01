import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { newsService } from './news.service';
import { GetListNewsDto } from './dto/get_list_news.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('News')
export class newsController {
  constructor(private readonly newsService: newsService) {}

  @ApiOperation({ summary: 'Lấy news' })
  @Get(':id')
  async getNews(@Param('id') id: number) {
    return this.newsService.getNews(id);
  }
  @ApiOperation({ summary: 'lấy danh sách news' })
  @Post('list_news')
  async getListNews(@Body() dto: GetListNewsDto) {
    return this.newsService.getListNews(dto);
  }
}
