import type { Metadata } from 'next'
import { fetchContestInvitePreview } from '@/lib/public-data'
import JoinClient from './JoinClient'

export const revalidate = 60

interface PageProps {
  params: { code: string }
}

function decodeCode(code: string) {
  try {
    return decodeURIComponent(code)
  } catch {
    return code
  }
}

const fallbackTitle = 'You have been challenged — Liberty Lift 1776'
const fallbackDescription =
  'A friend challenged you to 1,776 push-ups in July. Join their contest, log your reps, and put your state on the board.'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const preview = await fetchContestInvitePreview(decodeCode(params.code))

  const title = preview ? `Join ${preview.name} — Liberty Lift 1776` : fallbackTitle
  const description = preview
    ? `You have been invited to ${preview.name}: 1,776 push-ups in July. Join the contest, log your reps, and put your state on the board.`
    : fallbackDescription

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function ContestInvitePage({ params }: PageProps) {
  const preview = await fetchContestInvitePreview(decodeCode(params.code))

  return (
    <JoinClient
      contestName={preview?.name ?? null}
      participantCount={preview?.participant_count ?? 0}
    />
  )
}
