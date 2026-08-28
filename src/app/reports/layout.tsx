import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let user = null
  if (authUser) {
    const { data } = await supabase
      .from('users')
      .select('full_name, email, role')
      .eq('id', authUser.id)
      .single()
    user = data
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar user={user} />
      <main className="flex-1 min-w-0 md:p-6 p-4 pt-16 md:pt-6 pb-24 md:pb-6">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
