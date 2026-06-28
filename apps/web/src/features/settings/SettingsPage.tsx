import { useTranslation } from 'react-i18next'
import { useAppSelector } from '../../store/hooks'
import { PageHeader } from '../../components/ui/page-header'
import TelegramConfig from '../notifications/TelegramConfig'
import NotificationRules from '../notifications/NotificationRules'
import ChangePasswordCard from '../auth/ChangePasswordCard'

/**
 * Cài đặt: đổi mật khẩu (mọi role, sau đăng nhập) + cấu hình kênh Telegram và quy tắc
 * tự động gửi thông báo (cấp tenant). SystemAdmin chỉ thấy phần đổi mật khẩu.
 */
export default function SettingsPage() {
  const { t } = useTranslation()
  const isSuperadmin = useAppSelector((s) => s.auth.role) === 'SYSTEM_ADMIN'
  return (
    <div className="p-8">
      <PageHeader
        className="mb-6"
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />
      <div className="max-w-3xl space-y-6">
        <ChangePasswordCard />
        {!isSuperadmin && <TelegramConfig />}
        {!isSuperadmin && <NotificationRules />}
      </div>
    </div>
  )
}
