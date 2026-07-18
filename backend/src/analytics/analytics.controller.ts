import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';
import { Role } from '../common/enums/role.enum';
import { PeriodQueryDto } from './dto/analytics.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @ResponseMessage('Dashboard metrics')
  dashboard(@Query() query: PeriodQueryDto) {
    const { from, to } = query.range();
    return this.analytics.dashboard(from, to);
  }

  @Get('sales/summary')
  salesSummary(@Query() query: PeriodQueryDto) {
    const { from, to } = query.range();
    return this.analytics.salesSummary(from, to);
  }

  @Get('sales/revenue')
  revenue(@Query() query: PeriodQueryDto) {
    const { from, to } = query.range();
    return this.analytics.revenueSeries(from, to, query.granularity ?? 'day');
  }

  @Get('orders/by-status')
  ordersByStatus() {
    return this.analytics.ordersByStatus();
  }

  @Get('inventory/health')
  inventoryHealth() {
    return this.analytics.inventoryHealth();
  }

  @Get('support/tickets')
  support(@Query() query: PeriodQueryDto) {
    const { from, to } = query.range();
    return this.analytics.supportMetrics(from, to);
  }

  @Get('chat/metrics')
  chat(@Query() query: PeriodQueryDto) {
    const { from, to } = query.range();
    return this.analytics.chatMetrics(from, to);
  }

  // ── CSV report export ──
  @Get('reports/sales.csv')
  @RawResponse()
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="sales-report.csv"')
  async salesCsv(@Query() query: PeriodQueryDto): Promise<string> {
    const { from, to } = query.range();
    const rows = await this.analytics.salesReportRows(from, to);
    const header = [
      'Order Number',
      'Status',
      'Payment',
      'Total',
      'Currency',
      'Placed At',
    ].join(',');
    const body = rows
      .map((r) =>
        [
          r.orderNumber,
          r.status,
          r.paymentStatus,
          r.grandTotal,
          r.currency,
          r.placedAt.toISOString(),
        ].join(','),
      )
      .join('\n');
    return `${header}\n${body}`;
  }
}
