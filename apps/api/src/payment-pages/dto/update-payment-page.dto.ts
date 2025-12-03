import { PartialType } from '@nestjs/swagger';
import { CreatePaymentPageDto } from './create-payment-page.dto';

export class UpdatePaymentPageDto extends PartialType(CreatePaymentPageDto) {}
