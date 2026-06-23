import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProductsSearchService } from './modules/products/products-search.service';
import { DataSource } from 'typeorm';
import { Product } from './modules/products/entities/product.entity';

async function bootstrap() {
  console.log('--- Initializing NestJS Application Context... ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const dataSource = app.get(DataSource);
  const searchService = app.get(ProductsSearchService);

  console.log('--- Initializing Elasticsearch Index... ---');
  await searchService.createIndex();

  const productRepository = dataSource.getRepository(Product);
  
  console.log('--- Fetching existing products from MySQL database... ---');
  const products = await productRepository.find();

  console.log(`--- Synchronizing ${products.length} products to Elasticsearch... ---`);
  
  let successCount = 0;
  for (const product of products) {
    try {
      await searchService.indexProduct(product);
      successCount++;
      console.log(`[Synced] Product ID: ${product.id} - "${product.title}"`);
    } catch (err) {
      console.error(`[Error] Failed to sync Product ID: ${product.id}. Error:`, err);
    }
  }

  console.log(`\n--- Completed! Successfully synced ${successCount}/${products.length} products. ---`);
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error during synchronization boot:', err);
  process.exit(1);
});
