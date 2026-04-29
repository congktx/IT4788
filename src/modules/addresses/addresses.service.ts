import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import {APP_RESPONSE, buildResponse,} from '../../common/constants/response.constants';

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

    return buildResponse(APP_RESPONSE.OK, saved);
  }

  async getMyAddresses(userId: number) {
    const list = await this.addressRepository.find({
      where: { user_id: userId },
    });

    return buildResponse(APP_RESPONSE.OK, list);
  }
}