import { PartialType } from '@nestjs/swagger';
import { CreateSupCategoryDto } from './create-sup-category.dto';

export class UpdateSupCategoryDto extends PartialType(CreateSupCategoryDto) {}
