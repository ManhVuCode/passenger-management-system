export class CreateRoundDto {
  tripId: string;      // ID của chuyến đi (Lấy từ cái Trip vừa tạo lúc nãy)
  name: string;        // VD: Điểm danh
  timeText: string;    // VD: 07:00 Sáng
}