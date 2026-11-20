import { useId, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Loader2 } from 'lucide-react';

interface CreateUserDialogProps {
  roleType: 'agent' | 'supervisor';
  onSuccess: () => void;
}

export const CreateUserDialog = ({ roleType, onSuccess }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const id = useId();

  const resetForm = () => {
    setEmail(''); setPassword(''); setFirstName(''); setLastName('');
    setUsername(''); setPhone('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email.trim() || password.length < 6) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: email.trim().toLowerCase(), password,
          firstName: firstName.trim(), lastName: lastName.trim(),
          username: username.trim(), phone: phone.trim(),
          role: roleType,
        },
      });

      if (error) {
        let message = error.message;
        if (error.context instanceof Response) {
          try { message = (await error.context.json()).error || message; } catch { /* Use the SDK message. */ }
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.success || !data.userId) throw new Error(t('dialogs.accountCreationFailed'));

      toast({ title: t('dialogs.accountCreated'), description: t('dialogs.accountCreatedDesc') });
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: error instanceof Error ? error.message : t('dialogs.accountCreationFailed'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const title = roleType === 'agent' ? t('dialogs.createAgent') : t('dialogs.createSupervisor');

  return (
    <Dialog open={open} onOpenChange={next => {
      if (loading) return;
      setOpen(next);
      if (!next) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> {t('common.create').toUpperCase()}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t('dialogs.directAccountNote')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${id}-firstName`}>{t('auth.firstName')}</Label>
              <Input
                id={`${id}-firstName`}
                disabled={loading}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-lastName`}>{t('auth.lastName')}</Label>
              <Input
                id={`${id}-lastName`}
                disabled={loading}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-email`}>{t('auth.email')}</Label>
            <Input
              id={`${id}-email`}
              disabled={loading}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-password`}>{t('auth.password')}</Label>
            <Input
              id={`${id}-password`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              disabled={loading}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${id}-username`}>{t('admin.username')}</Label>
              <Input
                id={`${id}-username`}
                disabled={loading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-phone`}>{t('common.phone')}</Label>
              <Input
                id={`${id}-phone`}
                type="tel"
                disabled={loading}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading || !email.trim() || password.length < 6} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? t('dialogs.creating') : title}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
