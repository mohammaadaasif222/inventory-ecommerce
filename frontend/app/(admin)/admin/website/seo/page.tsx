'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
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
import { Textarea } from '@/components/ui/textarea';
import { config } from '@/lib/config';
import { useGlobalSeo, useSaveSeo } from '@/hooks/use-website';

interface SeoForm {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  noindex: boolean;
}

export default function SeoPage() {
  const { data: seo, isLoading } = useGlobalSeo();
  const save = useSaveSeo();
  const { register, handleSubmit, reset } = useForm<SeoForm>();

  useEffect(() => {
    if (seo) {
      reset({
        title: seo.title ?? '',
        description: seo.description ?? '',
        keywords: (seo.keywords ?? []).join(', '),
        ogImage: seo.ogImage ?? '',
        noindex: seo.noindex ?? false,
      });
    }
  }, [seo, reset]);

  const submit = handleSubmit((v) =>
    save.mutate(
      {
        scope: 'global',
        title: v.title,
        description: v.description,
        keywords: v.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        ogImage: v.ogImage,
        noindex: v.noindex,
      },
      {
        onSuccess: () => toast.success('SEO defaults saved'),
        onError: (e: Error) => toast.error(e.message),
      },
    ),
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const base = config.apiUrl.replace(/\/api$/, '');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="SEO"
        description="Global metadata defaults. Sitemap & robots are generated automatically."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`${base}/sitemap.xml`} target="_blank" rel="noreferrer">
                sitemap.xml <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`${base}/robots.txt`} target="_blank" rel="noreferrer">
                robots.txt <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        }
      />

      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Global defaults</CardTitle>
            <CardDescription>Used when a page/product has no override.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Default title</Label>
              <Input {...register('title')} placeholder="My Store — Quality goods" />
            </div>
            <div className="space-y-1.5">
              <Label>Default description</Label>
              <Textarea rows={2} {...register('description')} />
            </div>
            <div className="space-y-1.5">
              <Label>Keywords (comma-separated)</Label>
              <Input {...register('keywords')} />
            </div>
            <div className="space-y-1.5">
              <Label>OG image URL</Label>
              <Input {...register('ogImage')} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('noindex')} />
              Discourage search engines (robots.txt disallow all)
            </label>
            <div className="flex justify-end">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
