import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedSearch } from './entities/saved_search.entity';
import { SearchesController } from './searches.controller';
import { SearchesService } from './searches.service';
import { ProductModule } from '../products/product.module';

@Module({
  imports: [TypeOrmModule.forFeature([SavedSearch]) , ProductModule],
  controllers: [SearchesController],
  providers: [SearchesService],
  exports: [SearchesService],
})
export class SearchesModule {}