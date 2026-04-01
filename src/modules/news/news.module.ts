import { Module } from '@nestjs/common';
import { newsController } from './news.controller';
import { newsService } from './news.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { News } from './entities/news.entity';
@Module({
  imports: [TypeOrmModule.forFeature([News])],
  providers: [newsService],
  controllers: [newsController],
})
export class newsModule {}
