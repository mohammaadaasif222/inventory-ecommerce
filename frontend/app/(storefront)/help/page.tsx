'use client';

import Link from 'next/link';
import { Loader2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useArticles } from '@/hooks/use-storefront';

export default function HelpPage() {
  const { data: articles, isLoading } = useArticles();

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="text-muted-foreground">Guides and answers to common questions.</p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !articles || articles.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No published articles yet.
        </p>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <Link key={a._id} href={`/help/${a.slug}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 py-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    {a.excerpt ? (
                      <p className="text-sm text-muted-foreground">{a.excerpt}</p>
                    ) : null}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
