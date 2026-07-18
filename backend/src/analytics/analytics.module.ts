import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { StockItem } from '../inventory/entities/stock-item.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Chat, ChatSchema } from '../chat/schemas/chat.schema';
import { Message, MessageSchema } from '../chat/schemas/message.schema';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

/**
 * Read-only aggregation across modules. Registers the entities/collections it
 * reports on (TypeORM forFeature is additive across modules), so it never
 * mutates feature services.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      StockItem,
      StockMovement,
      Ticket,
    ]),
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
