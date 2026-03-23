import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdressService } from './adress.service';
import { CreateAdressDto } from './dto/create-adress.dto';
import { UpdateAdressDto } from './dto/update-adress.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { AccessRoles } from 'src/common/decorator/access-roles.decorator';
import { UserRole } from 'src/common/enum/index.enum';

@ApiTags('Adress')
@Controller('adress')
export class AdressController {
  constructor(private readonly adressService: AdressService) { }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Post()
  create(@Body() createAdressDto: CreateAdressDto, @Req() req: Request) {
    const marketId = (req as any).user.id;
    return this.adressService.createAddress(createAdressDto, marketId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET, UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get()
  findAll() {
    return this.adressService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET, UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adressService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdressDto: UpdateAdressDto,
    @Req() req: Request,
  ) {
    const marketId = (req as any).user.id;
    return this.adressService.updateAddress(id, updateAdressDto, marketId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @AccessRoles(UserRole.MARKET)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const marketId = (req as any).user.id;
    return this.adressService.deleteAddress(id, marketId);
  }
}
