import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/page-header'
import TelegramConfig from '../notifications/TelegramConfig'
import NotificationRules from '../notifications/NotificationRules'

/**
 * Cài đặt cấp đơn vị (tenant): cấu hình kênh Telegram (bot token) và các quy tắc
 * tự động gửi thông báo. Trước đây các thành phần này nằm lẫn trong trang chi tiết
 * chuyến đi, dù chúng là cấu hình chung cả tenant — nay đưa về đúng chỗ ở Cài đặt.
 */
export default function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div className="p-8">
      <PageHeader
        className="mb-6"
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />
      <div className="max-w-3xl space-y-6">
        <TelegramConfig />
        <NotificationRules />
      </div>
    </div>
  )
}
