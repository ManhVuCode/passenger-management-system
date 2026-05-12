# Shared Package — packages/shared
Framework-agnostic TypeScript types only. No NestJS, no React imports.

## Contents
- All domain entity interfaces (Trip, Round, Bus, User, Tenant...)
- All DTO interfaces
- Enums: Role, TripStatus, RoundStatus, AttendanceStatus
- ApiResponse<T>, PaginatedResponse<T>

## Locked enums
RoundStatus:      PLANNED | IN_PROGRESS | DONE | CANCELLED
TripStatus:       PLANNED | IN_PROGRESS | DONE | CANCELLED
AttendanceStatus: JOIN | ABSENT | CANCELLED
Role:             SYSTEM_ADMIN | ADMIN | BUS_MANAGER
