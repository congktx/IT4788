import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedSearch } from './entities/saved_search.entity';
import { SearchesController } from './searches.controller';
import { SearchesService } from './searches.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([SavedSearch]) , ProductsModule,],
  controllers: [SearchesController],
  providers: [SearchesService],
  exports: [SearchesService],
})
export class SearchesModule {}