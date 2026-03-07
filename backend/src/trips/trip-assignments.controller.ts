import { Body, Controller, Delete, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TripsService } from './trips.service';
import { UpdateTripAssignmentDto } from './dto/update-trip-assignment.dto';

@Controller('trip-assignments')
@UseGuards(AuthGuard('jwt'))
export class TripAssignmentsController {
  constructor(private readonly tripsService: TripsService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripAssignmentDto, @Req() req: any) {
    return this.tripsService.updateAssignment(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.removeAssignment(id, req.user);
  }
}

