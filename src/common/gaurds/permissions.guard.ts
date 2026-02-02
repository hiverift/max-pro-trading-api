import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no permissions are required, allow access (assuming other guards like Jwt/Roles passed)
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        // Super Admin has full access regardless of permission list
        if (user.role === 'superadmin') {
            return true;
        }

        if (user.role === 'admin') {
            // 1. Check direct direct/legacy permissions from JWT
            const legacyPermissions = user.permissions || [];
            const customPermissions = user.customPermissions || [];

            // 2. Resolve permissions from Roles (this requires population or pre-fetching)
            // Since we want to avoid DB hits on every guard call if possible,
            // the best approach for "dynamic" is to populate roles in JwtStrategy.
            // But if they are not in JWT, we combine what we have.

            const allUserPermissions = [
                ...legacyPermissions,
                ...customPermissions,
                ...(user.rolePermissions || []) // Placed here by upgraded JwtStrategy
            ];

            if (allUserPermissions.includes('ALL_ACCESS')) {
                return true;
            }

            // Check if user has all required permissions
            return requiredPermissions.every((permission) => allUserPermissions.includes(permission));
        }

        // Default to deny for any other role when specific admin permissions are required
        return false;
    }
}
