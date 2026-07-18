import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import {
  CalculateRatesDto,
  CreateMethodDto,
  CreateShipmentDto,
  CreateZoneDto,
  UpdateMethodDto,
  UpdateShipmentStatusDto,
  UpdateZoneDto,
} from './dto/shipping.dto';

const ADMIN = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  // ── rate quote (storefront) ──
  @Public()
  @Post('rates')
  @ResponseMessage('Rates calculated')
  rates(@Body() dto: CalculateRatesDto) {
    return this.shipping.calculateRates(dto);
  }

  // ── zones ──
  @ApiBearerAuth()
  @Get('zones')
  @Roles(...ADMIN)
  listZones() {
    return this.shipping.listZones();
  }
  @ApiBearerAuth()
  @Post('zones')
  @Roles(...ADMIN)
  @ResponseMessage('Zone created')
  createZone(@Body() dto: CreateZoneDto) {
    return this.shipping.createZone(dto);
  }
  @ApiBearerAuth()
  @Patch('zones/:id')
  @Roles(...ADMIN)
  updateZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.shipping.updateZone(id, dto);
  }
  @ApiBearerAuth()
  @Delete('zones/:id')
  @Roles(...ADMIN)
  async removeZone(@Param('id', ParseUUIDPipe) id: string) {
    await this.shipping.removeZone(id);
    return { removed: true };
  }

  // ── methods ──
  @ApiBearerAuth()
  @Get('methods')
  @Roles(...ADMIN)
  listMethods(@Query('zoneId') zoneId?: string) {
    return this.shipping.listMethods(zoneId);
  }
  @ApiBearerAuth()
  @Post('methods')
  @Roles(...ADMIN)
  @ResponseMessage('Method created')
  createMethod(@Body() dto: CreateMethodDto) {
    return this.shipping.createMethod(dto);
  }
  @ApiBearerAuth()
  @Patch('methods/:id')
  @Roles(...ADMIN)
  updateMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMethodDto,
  ) {
    return this.shipping.updateMethod(id, dto);
  }
  @ApiBearerAuth()
  @Delete('methods/:id')
  @Roles(...ADMIN)
  async removeMethod(@Param('id', ParseUUIDPipe) id: string) {
    await this.shipping.removeMethod(id);
    return { removed: true };
  }

  // ── shipments ──
  @ApiBearerAuth()
  @Get('shipments')
  @Roles(...ADMIN)
  listShipments(@Query('orderId') orderId?: string) {
    return this.shipping.listShipments(orderId);
  }
  @ApiBearerAuth()
  @Post('shipments')
  @Roles(...ADMIN)
  @ResponseMessage('Shipment created')
  createShipment(@Body() dto: CreateShipmentDto) {
    return this.shipping.createShipment(dto);
  }
  @ApiBearerAuth()
  @Patch('shipments/:id/status')
  @Roles(...ADMIN)
  @ResponseMessage('Shipment updated')
  updateShipment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shipping.updateShipmentStatus(id, dto);
  }
}
