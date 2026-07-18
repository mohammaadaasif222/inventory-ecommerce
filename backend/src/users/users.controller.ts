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
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Role } from '../common/enums/role.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import {
  AssignRolesDto,
  BanUserDto,
  ListUsersQueryDto,
} from './dto/admin-user.dto';
import { Audit } from '../admin/decorators/audit.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ── self-service ─────────────────────────────────────────────────────────
  @Get('me')
  @ResponseMessage('Profile loaded')
  me(@CurrentUser('id') userId: string) {
    return this.users.findById(userId);
  }

  @Patch('me')
  @ResponseMessage('Profile updated')
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(userId, dto);
  }

  @Get('me/addresses')
  listAddresses(@CurrentUser('id') userId: string) {
    return this.users.listAddresses(userId);
  }

  @Post('me/addresses')
  @ResponseMessage('Address added')
  addAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.users.addAddress(userId, dto);
  }

  @Patch('me/addresses/:id')
  @ResponseMessage('Address updated')
  updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.users.updateAddress(userId, addressId, dto);
  }

  @Delete('me/addresses/:id')
  @ResponseMessage('Address removed')
  removeAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    return this.users.removeAddress(userId, addressId);
  }

  // ── admin ─────────────────────────────────────────────────────────────────
  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('Users listed')
  list(@Query() query: ListUsersQueryDto) {
    return this.users.listUsers(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findById(id);
  }

  @Post(':id/ban')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Audit('USER_BANNED', 'User')
  @ResponseMessage('User banned')
  ban(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: BanUserDto,
  ) {
    return this.users.banUser(id);
  }

  @Post(':id/unban')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ResponseMessage('User unbanned')
  unban(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.unbanUser(id);
  }

  @Patch(':id/roles')
  @Roles(Role.SUPER_ADMIN)
  @Audit('USER_ROLES_UPDATED', 'User')
  @ResponseMessage('Roles updated')
  assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.users.assignRoles(id, dto);
  }
}
