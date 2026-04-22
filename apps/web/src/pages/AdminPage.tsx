import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import type { AdminUserInfo, AppSettingsResponse, ServingEndpointsByTier } from '@repo/types';
import { useUser } from '@/hooks/useUser';
import { adminService } from '@/services';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function AdminContent() {
  const { t } = useTranslation();
  const { user, isAdmin } = useUser();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [settings, setSettings] = useState<AppSettingsResponse | null>(null);
  const [servingEndpoints, setServingEndpoints] = useState<ServingEndpointsByTier | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const MODEL_NULL_SENTINEL = '__default__';

  // 非 Admin はホームにリダイレクト
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const data = await adminService.getUsers();
      setUsers(data.users);
    } catch {
      toast.error(t('admin.fetchError'));
    } finally {
      setIsLoadingUsers(false);
    }
  }, [t]);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoadingSettings(true);
      const data = await adminService.getSettings();
      setSettings(data);
    } catch {
      toast.error(t('admin.fetchError'));
    } finally {
      setIsLoadingSettings(false);
    }
  }, [t]);

  const fetchServingEndpoints = useCallback(async () => {
    try {
      setIsLoadingEndpoints(true);
      const data = await adminService.getServingEndpoints();
      setServingEndpoints(data);
    } catch {
      toast.error(t('admin.fetchEndpointsError'));
    } finally {
      setIsLoadingEndpoints(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchSettings();
      fetchServingEndpoints();
    }
  }, [isAdmin, fetchUsers, fetchSettings, fetchServingEndpoints]);

  const adminCount = useMemo(() => users.filter(u => u.is_admin).length, [users]);

  const handleRoleChange = async (userId: string, newIsAdmin: boolean) => {
    setUpdatingUserId(userId);
    try {
      await adminService.updateUserRole(userId, newIsAdmin);
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_admin: newIsAdmin } : u)));
      toast.success(t('admin.updateRoleSuccess'));
    } catch {
      toast.error(t('admin.updateRoleError'));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleModelChange = async (
    key: 'default_opus_model' | 'default_sonnet_model' | 'default_haiku_model',
    value: string | null
  ) => {
    setIsSavingSettings(true);
    try {
      await adminService.updateSettings({ [key]: value });
      setSettings(prev => (prev ? { ...prev, [key]: value } : prev));
      toast.success(t('admin.updateSettingsSuccess'));
    } catch {
      toast.error(t('admin.updateSettingsError'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDefaultRoleChange = async (value: string) => {
    const newDefault = value as 'admin' | 'member';
    setIsSavingSettings(true);
    try {
      await adminService.updateSettings({ default_new_user_role: newDefault });
      setSettings(prev => (prev ? { ...prev, default_new_user_role: newDefault } : prev));
      toast.success(t('admin.updateSettingsSuccess'));
    } catch {
      toast.error(t('admin.updateSettingsError'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">{t('admin.title')}</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">{t('admin.settings')}</h2>
          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t('admin.defaultRole')}</p>
                <Select
                  value={settings?.default_new_user_role ?? 'admin'}
                  onValueChange={handleDefaultRoleChange}
                  disabled={isSavingSettings}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('admin.roleAdmin')}</SelectItem>
                    <SelectItem value="member">{t('admin.roleMember')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">{t('admin.modelConfiguration')}</h2>
          {isLoadingEndpoints || isLoadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4 space-y-4">
              {(
                [
                  { key: 'default_opus_model', label: t('admin.opusModel'), options: servingEndpoints?.opus ?? [] },
                  { key: 'default_sonnet_model', label: t('admin.sonnetModel'), options: servingEndpoints?.sonnet ?? [] },
                  { key: 'default_haiku_model', label: t('admin.haikuModel'), options: servingEndpoints?.haiku ?? [] },
                ] as const
              ).map(({ key, label, options }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium shrink-0">{label}</p>
                  <Select
                    value={settings?.[key] ?? MODEL_NULL_SENTINEL}
                    onValueChange={v =>
                      handleModelChange(key, v === MODEL_NULL_SENTINEL ? null : v)
                    }
                    disabled={isSavingSettings}
                  >
                    <SelectTrigger className="w-[320px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MODEL_NULL_SENTINEL}>
                        {t('admin.envDefault')}
                      </SelectItem>
                      {options.map(name => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">{t('admin.userManagement')}</h2>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t('admin.userId')}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t('admin.email')}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t('admin.role')}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t('admin.createdAt')}
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      {t('admin.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isCurrentUser = u.id === user?.id;
                    const isLastAdmin = u.is_admin && adminCount <= 1;
                    const isUpdating = updatingUserId === u.id;

                    return (
                      <tr key={u.id} className="border-t border-border">
                        <td className="px-4 py-3 text-sm font-mono truncate max-w-[300px]">
                          {u.id}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({t('admin.you')})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[250px]">
                          {u.email ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm ${u.is_admin ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}
                          >
                            {u.is_admin ? (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            ) : (
                              <ShieldOff className="h-3.5 w-3.5" />
                            )}
                            {u.is_admin ? t('admin.roleAdmin') : t('admin.roleMember')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.is_admin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isLastAdmin || isUpdating}
                              onClick={() => handleRoleChange(u.id, false)}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                t('admin.demote')
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => handleRoleChange(u.id, true)}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                t('admin.promote')
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
