import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { User } from '../users/entities/user.entity';
import { Transaction } from './entities/transaction.entity';
import { GetBalanceHistoryDto } from './dto/get-balance-history.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async getCurrentBalance(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    let wallet = await this.walletRepository.findOne({
      where: { user_id: user.id },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        user_id: user.id,
        balance: 0,
        pending_balance: 0,
      });

      wallet = await this.walletRepository.save(wallet);
    }

    return {
      code: '1000',
      message: 'OK',
      data: {
        available_balance: Number(wallet.balance || 0),
        pending_balance: Number(wallet.pending_balance || 0),
      },
    };
  }

  async getBalanceHistory(body: GetBalanceHistoryDto, userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: '9998',
        message: 'Token is invalid',
        data: null,
      });
    }

    const index = Number(body.index);
    const count = Number(body.count);

    if (
      isNaN(index) ||
      isNaN(count) ||
      index < 0 ||
      count <= 0
    ) {
      throw new BadRequestException({
        code: '1004',
        message: 'Parameter value is invalid',
        data: null,
      });
    }

    let wallet = await this.walletRepository.findOne({
      where: { user_id: user.id },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        user_id: user.id,
        balance: 0,
        pending_balance: 0,
      });

      wallet = await this.walletRepository.save(wallet);
    }

    const transactions = await this.transactionRepository.find({
      where: { wallet_id: wallet.id },
      order: { created_at: 'DESC' },
      skip: index,
      take: count,
    });

    return {
      code: '1000',
      message: 'OK',
      data: transactions.map((tx) => ({
        history_id: tx.id,
        object_id: '',
        title: this.getTransactionTitle(tx),
        detail: tx.description || '',
        balance: Number(tx.amount || 0),
        date: tx.created_at,
        type: tx.type || '',
      })),
    };
  }

  private getTransactionTitle(tx: Transaction): string {
    if (tx.type === 'income') return 'Income transaction';
    if (tx.type === 'expense') return 'Expense transaction';
    return 'Wallet transaction';
  }
}