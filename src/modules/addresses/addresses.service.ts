import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async createAddress(userId: number, body: CreateAddressDto) {
    const address = this.addressRepository.create({
      user_id: userId,
      receiver_name: body.receiver_name,
      phone: body.phone,
      full_address: body.full_address,
      is_default: false,
    });

    const saved = await this.addressRepository.save(address);

    return {
      code: '1000',
      message: 'OK',
      data: saved,
    };
  }

  async getMyAddresses(userId: number) {
    const list = await this.addressRepository.find({
      where: { user_id: userId },
    });

    return {
      code: '1000',
      message: 'OK',
      data: list,
    };
  }
}