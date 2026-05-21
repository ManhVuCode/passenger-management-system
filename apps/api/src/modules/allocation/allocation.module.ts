import { Module } from '@nestjs/common';
import { AllocationController, AllocationSummaryController } from './allocation.controller';
import { AllocationService } from './allocation.service';

@Module({
  controllers: [AllocationSummaryController, AllocationController],
  providers: [AllocationService]
})
export class AllocationModule {}
