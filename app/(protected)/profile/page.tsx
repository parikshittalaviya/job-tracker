import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/profile/profile-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata = { title: 'Profile & Settings — Job Tracker' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, anthropic_key, role')
    .eq('id', user.id)
    .single()

  const { data: usage } = await supabase
    .from('tailoring_usage')
    .select('count')
    .eq('user_id', user.id)
    .eq('usage_date', new Date().toISOString().split('T')[0])
    .single()

  const todayCount = usage?.count ?? 0
  const hasOwnKey = !!profile?.anthropic_key

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile & Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account details and API configuration.</p>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Update your name shown across the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            userId={user.id}
            initialFullName={profile?.full_name ?? ''}
            email={user.email!}
            initialApiKey={profile?.anthropic_key ?? ''}
            todayCount={todayCount}
            hasOwnKey={hasOwnKey}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Role badge */}
      {profile?.role === 'admin' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base text-primary">Admin Access</CardTitle>
            <CardDescription>You have admin privileges. Access the admin panel from the navigation.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
