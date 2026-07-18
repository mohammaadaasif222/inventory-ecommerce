import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('audit-log')
  @ResponseMessage('Audit log listed')
  auditLog(@Query() query: PaginationQueryDto) {
    return this.admin.listAuditLogs(query);
  }

  @Get('permissions')
  @ResponseMessage('Permission matrix loaded')
  permissions() {
    return this.admin.getPermissionMatrix();
  }
}
