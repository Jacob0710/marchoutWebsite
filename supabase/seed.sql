-- Run this file in the Supabase SQL Editor after supabase/schema.sql.
-- It is idempotent: re-running it updates these records by slug.

insert into activities (
  title,
  slug,
  academic_year,
  activity_type,
  event_date,
  location,
  participants_count,
  result_summary,
  content,
  cover_image_url,
  status,
  is_featured,
  tags
)
values
  (
    'Welcome Gathering 114',
    'welcome-gathering-114',
    114,
    'regular',
    '2025-09-15',
    'Campus Community Room',
    40,
    'A welcome gathering for new members and local community partners.',
    'Members introduced the club mission, shared upcoming service plans, and prepared a simple community activity together.',
    'https://images.unsplash.com/photo-1527525443983-6e60c75fff46?auto=format&fit=crop&w=1400&q=80',
    'published',
    true,
    array['welcome', 'community', 'volunteer']
  ),
  (
    'Breakfast Care Project 114',
    'breakfast-care-114',
    114,
    'project',
    '2025-10-12',
    'Neighborhood Community Center',
    30,
    'Volunteers prepared and delivered breakfast packs with local partners.',
    'The project combined food preparation, delivery, and conversations with residents to understand their needs.',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=80',
    'published',
    true,
    array['breakfast', 'care', 'community']
  ),
  (
    'Christmas Care Visit 113',
    'christmas-care-113',
    113,
    'exploration',
    '2024-12-20',
    'Local Senior Center',
    35,
    'A winter visit with activities and care packages for local residents.',
    'Participants planned small group activities and delivered care packages during the holiday season.',
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1400&q=80',
    'published',
    false,
    array['christmas', 'care', 'exploration']
  ),
  (
    'Draft Activity for RLS Verification',
    'draft-rls-verification',
    114,
    'regular',
    '2025-12-31',
    'Internal Planning Location',
    0,
    'This record exists only to verify that anonymous users cannot read draft activities.',
    'This draft must not appear on the public homepage, activity list, detail page, or diagnostic page.',
    null,
    'draft',
    false,
    array['rls-verification']
  )
on conflict (slug) do update set
  title = excluded.title,
  academic_year = excluded.academic_year,
  activity_type = excluded.activity_type,
  event_date = excluded.event_date,
  location = excluded.location,
  participants_count = excluded.participants_count,
  result_summary = excluded.result_summary,
  content = excluded.content,
  cover_image_url = excluded.cover_image_url,
  status = excluded.status,
  is_featured = excluded.is_featured,
  tags = excluded.tags,
  updated_at = now();
