import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Audit } from '../admin/decorators/audit.decorator';
import {
  AdjustStockDto,
  CreateWarehouseDto,
  ListMovementsQueryDto,
  ListStockQueryDto,
  SetThresholdDto,
  TransferStockDto,
} from './dto/inventory.dto';

const MANAGE = [Role.ADMIN, Role.SUPER_ADMIN];

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
@Roles(...MANAGE)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  // ── warehouses ──
  @Get('warehouses')
  @ResponseMessage('Warehouses listed')
  listWarehouses() {
    return this.inventory.listWarehouses();
  }

  @Post('warehouses')
  @Audit('WAREHOUSE_CREATED', 'Warehouse')
  @ResponseMessage('Warehouse created')
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventory.createWarehouse(dto);
  }

  // ── stock ──
  @Get('stock')
  @ResponseMessage('Stock listed')
  listStock(@Query() query: ListStockQueryDto) {
    return this.inventory.listStock(query);
  }

  @Get('stock/low')
  @ResponseMessage('Low stock listed')
  lowStock() {
    return this.inventory.lowStockItems();
  }

  @Post('stock/adjust')
  @Audit('STOCK_ADJUSTED', 'StockItem')
  @ResponseMessage('Stock adjusted')
  adjust(@Body() dto: AdjustStockDto, @CurrentUser('id') userId: string) {
    return this.inventory.adjustStock(dto, userId);
  }

  @Post('stock/transfer')
  @Audit('STOCK_TRANSFERRED', 'StockItem')
  @ResponseMessage('Stock transferred')
  transfer(@Body() dto: TransferStockDto, @CurrentUser('id') userId: string) {
    return this.inventory.transferStock(dto, userId);
  }

  @Post('stock/threshold')
  @ResponseMessage('Threshold updated')
  setThreshold(@Body() dto: SetThresholdDto) {
    return this.inventory.setThreshold(dto);
  }

  // ── movements ──
  @Get('movements')
  @ResponseMessage('Movements listed')
  movements(@Query() query: ListMovementsQueryDto) {
    return this.inventory.listMovements(query);
  }
}
