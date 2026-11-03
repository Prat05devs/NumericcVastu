import {Shell} from '@/components/admin/Shell';
export const metadata = {title: 'Back office', robots: {index: false, follow: false}};
export default function AdminLayout({children}: {children: React.ReactNode}) {
  return <Shell>{children}</Shell>;
}
