import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enum/index.enum';

export const ROLES_KEY = 'roles';

export const AccessRoles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
