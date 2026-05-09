import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../orders/entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import {
  APP_RESPONSE,
  buildResponse,
} from '../../common/constants/response.constants';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async createAddress(userId: number, body: CreateAddressDto) {
    const requiredFields: Array<keyof CreateAddressDto> = [
      'receiver_name',
      'phone',
      'full_address',
      'is_default',
      'ward_id',
      'lat',
      'lng',
    ];

    for (const field of requiredFields) {
      const value = body?.[field];

      if (value === undefined || value === null || value === '') {
        return buildResponse(APP_RESPONSE.PARAMETER_NOT_ENOUGH, null);
      }
    }

    if (
      typeof body.receiver_name !== 'string' ||
      typeof body.phone !== 'string' ||
      typeof body.full_address !== 'string' ||
      typeof body.is_default !== 'boolean' ||
      typeof body.ward_id !== 'number' ||
      typeof body.lat !== 'number' ||
      typeof body.lng !== 'number'
    ) {
      return buildResponse(APP_RESPONSE.PARAMETER_TYPE_INVALID, null);
    }

    const saved = await this.addressRepository.save({
      user_id: userId,
      ward_id: body.ward_id,
      receiver_name: body.receiver_name,
      phone: body.phone,
      full_address: body.full_address,
      is_default: body.is_default,
      lat: body.lat,
      lng: body.lng,
      address_name: body.address_name ?? null,
      address_detail: body.address_detail ?? null,
    } as Partial<Address>);

    return buildResponse(APP_RESPONSE.OK, saved);
  }

  async getMyAddresses(userId: number) {
    const list = await this.addressRepository.find({
      where: { user_id: userId },
    });

    return buildResponse(APP_RESPONSE.OK, list);
  }
}