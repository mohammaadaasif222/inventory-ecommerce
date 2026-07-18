'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Cloud,
  HardDrive,
  Loader2,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  storageConfigSchema,
  type StorageConfigFormValues,
  type StorageProvider,
} from '@/schemas/storage.schema';
import {
  useSaveStorageConfig,
  useStorageConfig,
  useTestConnection,
} from '@/hooks/use-storage-config';

const PROVIDERS: {
  value: StorageProvider;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'cloudinary',
    label: 'Cloudinary',
    description: 'Managed CDN with image transforms & webp conversion.',
    icon: Cloud,
  },
  {
    value: 's3',
    label: 'Amazon S3',
    description: 'Scalable object storage with presigned direct uploads.',
    icon: Server,
  },
  {
    value: 'local',
    label: 'Local Storage',
    description: 'Filesystem storage for development / fallback.',
    icon: HardDrive,
  },
];

export default function StorageSettingsPage() {
  const { data: cfg, isLoading } = useStorageConfig();
  const save = useSaveStorageConfig();
  const test = useTestConnection();

  const form = useForm<StorageConfigFormValues>({
    resolver: zodResolver(storageConfigSchema),
    defaultValues: {
      provider: 'local',
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: '',
      s3AccessKey: '',
      s3SecretKey: '',
      s3Bucket: '',
      s3Region: '',
      s3Endpoint: '',
      isActive: true,
    },
  });

  const provider = form.watch('provider');

  // Hydrate the form once config loads. Non-secret fields are prefilled;
  // secret fields stay blank (blank = keep stored secret).
  useEffect(() => {
    if (!cfg) return;
    form.reset({
      provider: cfg.provider,
      cloudinaryCloudName: cfg.cloudinaryCloudName ?? '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: '',
      s3AccessKey: '',
      s3SecretKey: '',
      s3Bucket: cfg.s3Bucket ?? '',
      s3Region: cfg.s3Region ?? '',
      s3Endpoint: cfg.s3Endpoint ?? '',
      isActive: cfg.isActive,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);

  const onSave = form.handleSubmit((values) => {
    save.mutate(values, {
      onSuccess: (data) =>
        toast.success(`Saved — “${data.provider}” is now the active provider.`),
      onError: (err: Error) => toast.error(err.message),
    });
  });

  const onTest = () => {
    const values = form.getValues();
    test.mutate(values, {
      onSuccess: (res) =>
        toast.success(`Connection OK — ${res.provider} is reachable.`),
      onError: (err: Error) => toast.error(`Test failed: ${err.message}`),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading storage
        config…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Storage Settings"
        description="Choose where uploaded files are stored. Switch providers at any time — no redeploy required."
        actions={
          cfg ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active: {cfg.provider}
            </Badge>
          ) : null
        }
      />

      <form onSubmit={onSave} className="space-y-6">
        {/* Provider selector */}
        <Card>
          <CardHeader>
            <CardTitle>Active provider</CardTitle>
            <CardDescription>
              The selected provider handles every upload across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={provider}
              onValueChange={(v) =>
                form.setValue('provider', v as StorageProvider, {
                  shouldValidate: true,
                })
              }
              className="grid gap-3 sm:grid-cols-3"
            >
              {PROVIDERS.map((p) => {
                const Icon = p.icon;
                const selected = provider === p.value;
                return (
                  <Label
                    key={p.value}
                    htmlFor={`provider-${p.value}`}
                    className={cn(
                      'flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors',
                      selected
                        ? 'border-primary ring-1 ring-primary'
                        : 'hover:bg-accent',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5" />
                      <RadioGroupItem
                        id={`provider-${p.value}`}
                        value={p.value}
                      />
                    </div>
                    <span className="font-medium">{p.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.description}
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Dynamic credential fields */}
        <Card>
          <CardHeader>
            <CardTitle>
              {PROVIDERS.find((p) => p.value === provider)?.label} configuration
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secrets are encrypted (AES-256) at rest. Leave secret fields blank
              to keep the stored value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {provider === 'cloudinary' && (
              <>
                <Field
                  label="Cloud name"
                  error={form.formState.errors.cloudinaryCloudName?.message}
                >
                  <Input
                    placeholder="my-cloud"
                    {...form.register('cloudinaryCloudName')}
                  />
                </Field>
                <Field label="API key">
                  <Input
                    placeholder={mask(cfg?.cloudinaryApiKey)}
                    {...form.register('cloudinaryApiKey')}
                  />
                </Field>
                <Field label="API secret">
                  <Input
                    type="password"
                    placeholder={mask(cfg?.cloudinaryApiSecret)}
                    {...form.register('cloudinaryApiSecret')}
                  />
                </Field>
              </>
            )}

            {provider === 's3' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Bucket"
                    error={form.formState.errors.s3Bucket?.message}
                  >
                    <Input
                      placeholder="my-bucket"
                      {...form.register('s3Bucket')}
                    />
                  </Field>
                  <Field
                    label="Region"
                    error={form.formState.errors.s3Region?.message}
                  >
                    <Input
                      placeholder="us-east-1"
                      {...form.register('s3Region')}
                    />
                  </Field>
                </div>
                <Field label="Access key ID">
                  <Input
                    placeholder={mask(cfg?.s3AccessKey)}
                    {...form.register('s3AccessKey')}
                  />
                </Field>
                <Field label="Secret access key">
                  <Input
                    type="password"
                    placeholder={mask(cfg?.s3SecretKey)}
                    {...form.register('s3SecretKey')}
                  />
                </Field>
                <Field label="Custom endpoint (optional — MinIO / R2 / Spaces)">
                  <Input
                    placeholder="https://s3.example.com"
                    {...form.register('s3Endpoint')}
                  />
                </Field>
              </>
            )}

            {provider === 'local' && (
              <Alert>
                <HardDrive className="h-4 w-4" />
                <AlertTitle>No credentials required</AlertTitle>
                <AlertDescription>
                  Files are written to the server&apos;s{' '}
                  <code className="rounded bg-muted px-1">/uploads</code>{' '}
                  directory and served statically. Best for local development.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Separator />

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onTest}
            disabled={test.isPending}
          >
            {test.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Test connection
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save &amp; Activate
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function mask(value?: string | null): string {
  return value && value.length > 0 ? `${value} (unchanged)` : 'Not set';
}
