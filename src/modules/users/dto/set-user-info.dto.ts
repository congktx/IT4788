import { Allow } from "class-validator";

export class SetUserInfoDto {
  @Allow()
  email!: string;

  username!: string;

  status!: string;

  avatar!: string;

  firstname!: string;

  lastname!: string;

  address!: string;

  cover_image!: string;

  cover_image_web!: string;
}