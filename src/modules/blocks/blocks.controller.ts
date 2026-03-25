import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { SetUserBlockDto } from './dto/set-user-block.dto';
import { BlocksService } from './blocks.service';
import { GetListBlocksDto } from './dto/get-list-blocks.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id?: number;
    userId?: number;
    sub?: number;
  };
};

@Controller()
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post('set_user_block')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async setUserBlock(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SetUserBlockDto,
  ) {
    const currentUserId = Number(
      req.user?.id ?? req.user?.userId ?? req.user?.sub,
    );

    return this.blocksService.setUserBlock(currentUserId, dto);
  }

  @Post('get_list_blocks')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async getListBlocks(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GetListBlocksDto,
  ) {
    const currentUserId = Number(
      req.user?.id ?? req.user?.userId ?? req.user?.sub,
    );

    return this.blocksService.getListBlocks(currentUserId, dto);
  }
}
