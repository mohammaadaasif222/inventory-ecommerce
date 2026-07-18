import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';
import { privateMetadata } from '@/lib/seo';

export function generateMetadata() {
  return privateMetadata('My account');
}

export default async function AccountPage() {
  const { slug } = await getActiveTheme();
  const Template = await resolveTemplate(slug, 'account');
  return <Template />;
}
