import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ElonService } from './elon.service';
import { CreateElonDto } from './dto/create-elon.dto';
import { UpdateElonDto } from './dto/update-elon.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';

@ApiTags('Elon')
@Controller('elon')
export class ElonController {
  constructor(private readonly elonService: ElonService) { }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  create(@Body() createElonDto: CreateElonDto) {
    return this.elonService.create(createElonDto);
  }

  @Get()
  findAll() {
    return this.elonService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.elonService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateElonDto: UpdateElonDto) {
    return this.elonService.update(id, updateElonDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.elonService.delete(id);
  }
}
