import { ConfigProvider, Spin, Toast } from '@douyinfe/semi-ui';
import zh_CN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Workspace } from './components/Workspace';

Toast.config({ top: 80 });

function Splash() {
  return (
    <div className="admin-splash">
      <div className="admin-splash__mark">H</div>
      <Spin size="large" />
      <p>正在验证 GitHub 身份…</p>
    </div>
  );
}

function Gate() {
  const { status } = useAuth();
  if (status === 'loading') return <Splash />;
  if (status === 'anonymous') return <LoginScreen />;
  return <Workspace />;
}

export default function AdminApp() {
  return (
    <ConfigProvider locale={zh_CN}>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ConfigProvider>
  );
}
