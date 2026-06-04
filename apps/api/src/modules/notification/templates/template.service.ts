import { Injectable } from '@nestjs/common'

/** Stable keys persisted on NotificationLog.templateKey. */
export type TemplateKey =
  | 'round.started'
  | 'round.cancelled'
  | 'round.completed'
  | 'boarding.reminder'

export type TemplateLocale = 'vi' | 'en'

/** Variables a template may interpolate. All optional — missing ones render empty. */
export interface TemplateVars {
  passengerName?: string
  tripName?: string
  roundName?: string
  busPlate?: string
  departureTime?: string
}

const TEMPLATES: Record<TemplateKey, Record<TemplateLocale, string>> = {
  'round.started': {
    vi: 'Xin chào {{passengerName}}, xe {{busPlate}} chuyến {{tripName}} đang khởi hành. Mời quý khách lên xe.',
    en: 'Hello {{passengerName}}, bus {{busPlate}} for trip {{tripName}} is departing. Please board.',
  },
  'round.cancelled': {
    vi: 'Thông báo: Chặng {{roundName}} chuyến {{tripName}} đã bị hủy. Vui lòng liên hệ công ty để được hỗ trợ.',
    en: 'Notice: Round {{roundName}} of trip {{tripName}} has been cancelled. Please contact the company.',
  },
  'round.completed': {
    vi: 'Chặng {{roundName}} chuyến {{tripName}} đã hoàn thành. Cảm ơn quý khách đã đồng hành.',
    en: 'Round {{roundName}} of trip {{tripName}} is complete. Thank you for travelling with us.',
  },
  'boarding.reminder': {
    vi: 'Nhắc nhở: xe {{busPlate}} chuyến {{tripName}} khởi hành lúc {{departureTime}}. Quý khách vui lòng có mặt đúng giờ.',
    en: 'Reminder: bus {{busPlate}} for trip {{tripName}} departs at {{departureTime}}. Please be on time.',
  },
}

@Injectable()
export class TemplateService {
  /** Render a template to text, substituting {{var}} placeholders. */
  render(key: TemplateKey, vars: TemplateVars, locale: TemplateLocale = 'vi'): string {
    const template = TEMPLATES[key][locale]
    return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      const value = (vars as Record<string, string | undefined>)[name]
      return value ?? ''
    })
  }
}
