import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Types for our database
export interface Profile {
  id: string
  email: string
  display_name: string | null
  state_code: string | null
  avatar_url: string | null
  created_at: string
}

export interface PushupLog {
  id: string
  user_id: string
  count: number
  logged_at: string
  notes: string | null
}

export interface UserStats {
  user_id: string
  total_pushups: number
  current_streak: number
  longest_streak: number
  best_day: number
  days_logged: number
  last_log_date: string | null
}

export interface LeaderboardEntry {
  id: string
  display_name: string | null
  state_code: string | null
  avatar_url: string | null
  total_pushups: number
  current_streak: number
  longest_streak: number
  best_day: number
  days_logged: number
  global_rank: number
}

export interface Contest {
  id: string
  name: string
  description: string | null
  creator_id: string
  invite_code: string
  is_public: boolean
  start_date: string
  end_date: string
  created_at: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  threshold: number | null
  requirement_type: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  earned_at: string
}

// American fun facts for milestones
export const AMERICAN_FACTS = [
  { threshold: 1, fact: "The first push-up in recorded history was performed by a Colonial soldier in 1776!" },
  { threshold: 13, fact: "13 - the number of original colonies that declared independence!" },
  { threshold: 50, fact: "50 push-ups done! That's one for each state in the union! 🇺🇸" },
  { threshold: 76, fact: "'76 was the year it all began. You're writing your own declaration of fitness!" },
  { threshold: 100, fact: "Triple digits! The Constitution was signed by 39 delegates - you've done more push-ups than signers!" },
  { threshold: 176, fact: "You've done 10% of 1776! The Declaration of Independence has about 1,320 words." },
  { threshold: 250, fact: "George Washington stood 6'2\" - tall for his era. Your strength is growing!" },
  { threshold: 444, fact: "Quarter of the way! The Revolutionary War lasted 8 years - your challenge is just 31 days!" },
  { threshold: 500, fact: "500 strong! Paul Revere rode about 20 miles on his midnight ride." },
  { threshold: 776, fact: "More than halfway to 1776! Benjamin Franklin was 70 years old when he signed the Declaration." },
  { threshold: 888, fact: "Exactly halfway! The Liberty Bell weighs about 2,080 pounds." },
  { threshold: 1000, fact: "ONE THOUSAND! The American flag has had 27 versions since 1777." },
  { threshold: 1492, fact: "1492 - Columbus sailed the ocean blue, and you're sailing toward victory!" },
  { threshold: 1600, fact: "Almost there! The White House has 132 rooms and 35 bathrooms." },
  { threshold: 1700, fact: "76 to go! The Statue of Liberty's torch is 305 feet above the ground." },
  { threshold: 1776, fact: "🎆 LIBERTY ACHIEVED! 🎆 You've completed the 1776 Push-Up Challenge! You are a TRUE PATRIOT!" },
]

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington D.C.'
}
