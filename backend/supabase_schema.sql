-- Supabase schema for SondArt
-- All tables are created with Row Level Security enabled from the start.

-- profiles table stores authenticated user metadata
create table profiles (
  id uuid primary key default auth.uid(),
  email text not null,
  username text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table profiles enable row level security;
create policy "Profiles owner select" on profiles for select using (auth.uid() = id);
create policy "Profiles owner insert" on profiles for insert with check (auth.uid() = id);
create policy "Profiles owner update" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Profiles owner delete" on profiles for delete using (auth.uid() = id);

-- surveys owned by a profile
create table surveys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  collecte_identite boolean not null default false,
  visibility text default 'private',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table surveys enable row level security;
create policy "Surveys owner select" on surveys for select using (auth.uid() = owner_id);
create policy "Surveys owner insert" on surveys for insert with check (auth.uid() = owner_id);
create policy "Surveys owner update" on surveys for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Surveys owner delete" on surveys for delete using (auth.uid() = owner_id);

-- questions attached to surveys
create table questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'text',
  options jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table questions drop constraint if exists questions_question_type_check;
alter table questions add constraint questions_question_type_check
  check (question_type in ('single_choice', 'multiple_choice', 'open_ended'));
alter table questions enable row level security;
create policy "Questions owner select" on questions for select using (
  exists (select 1 from surveys where surveys.id = questions.survey_id and surveys.owner_id = auth.uid())
);
create policy "Questions owner insert" on questions for insert with check (
  exists (select 1 from surveys where surveys.id = questions.survey_id and surveys.owner_id = auth.uid())
);
create policy "Questions owner update" on questions for update using (
  exists (select 1 from surveys where surveys.id = questions.survey_id and surveys.owner_id = auth.uid())
) with check (
  exists (select 1 from surveys where surveys.id = questions.survey_id and surveys.owner_id = auth.uid())
);
create policy "Questions owner delete" on questions for delete using (
  exists (select 1 from surveys where surveys.id = questions.survey_id and surveys.owner_id = auth.uid())
);

-- respondents are linked to a survey and represent an anonymous participant
create table respondents (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  anonymous_key text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);
alter table respondents enable row level security;
create policy "Respondents anonymous insert" on respondents for insert with check (true);
create policy "Respondents owner select" on respondents for select using (
  exists (select 1 from surveys where surveys.id = respondents.survey_id and surveys.owner_id = auth.uid())
);
create policy "Respondents owner delete" on respondents for delete using (
  exists (select 1 from surveys where surveys.id = respondents.survey_id and surveys.owner_id = auth.uid())
);

-- answers belong to questions and respondents
create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  respondent_id uuid not null references respondents(id) on delete cascade,
  answer_text text,
  answer_value numeric,
  created_at timestamp with time zone default now()
);
alter table answers enable row level security;
create policy "Answers anonymous insert" on answers for insert with check (true);
create policy "Answers owner select" on answers for select using (
  exists (
    select 1
    from questions q
    join surveys s on s.id = q.survey_id
    where q.id = answers.question_id
      and s.owner_id = auth.uid()
  )
);
create policy "Answers owner update" on answers for update using (
  exists (
    select 1
    from questions q
    join surveys s on s.id = q.survey_id
    where q.id = answers.question_id
      and s.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from questions q
    join surveys s on s.id = q.survey_id
    where q.id = answers.question_id
      and s.owner_id = auth.uid()
  )
);
create policy "Answers owner delete" on answers for delete using (
  exists (
    select 1
    from questions q
    join surveys s on s.id = q.survey_id
    where q.id = answers.question_id
      and s.owner_id = auth.uid()
  )
);

-- survey participations prevent duplicated respondents per survey
create table survey_participations (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  respondent_id uuid not null references respondents(id) on delete cascade,
  fingerprint text not null,
  participated_at timestamp with time zone default now(),
  constraint unique_survey_respondent unique (survey_id, respondent_id),
  constraint unique_survey_fingerprint unique (survey_id, fingerprint)
);
alter table survey_participations enable row level security;
create policy "Survey participations anonymous insert" on survey_participations for insert with check (true);
create policy "Survey participations owner select" on survey_participations for select using (
  exists (select 1 from surveys where surveys.id = survey_participations.survey_id and surveys.owner_id = auth.uid())
);

-- archive des réponses pour audit après reset de sondage
create table survey_archives (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  question_id uuid not null references questions(id),
  question_text text not null,
  respondent_id uuid not null references respondents(id),
  answer_text text,
  answer_value numeric,
  created_at timestamp with time zone,
  archived_at timestamp with time zone default now(),
  archived_by uuid not null references profiles(id) on delete cascade
);
alter table survey_archives enable row level security;
create policy "Survey archives owner select" on survey_archives for select using (
  exists (select 1 from surveys where surveys.id = survey_archives.survey_id and surveys.owner_id = auth.uid())
);
create policy "Survey archives insert" on survey_archives for insert with check (
  exists (select 1 from surveys where surveys.id = survey_archives.survey_id and surveys.owner_id = auth.uid())
);

-- journalisation des actions administratives
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  survey_id uuid references surveys(id) on delete cascade,
  action text not null,
  detail text,
  created_at timestamp with time zone default now()
);
alter table audit_log enable row level security;
create policy "Audit log insert self" on audit_log for insert with check (auth.uid() = user_id);
create policy "Audit log owner select" on audit_log for select using (auth.uid() = user_id);

-- subscriptions for survey notifications or paid access
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  survey_id uuid not null references surveys(id) on delete cascade,
  plan text not null,
  status text not null default 'active',
  started_at timestamp with time zone default now(),
  renewed_at timestamp with time zone default now()
);
alter table subscriptions enable row level security;
create policy "Subscriptions owner select" on subscriptions for select using (auth.uid() = user_id);
create policy "Subscriptions owner insert" on subscriptions for insert with check (auth.uid() = user_id);
create policy "Subscriptions owner update" on subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Subscriptions owner delete" on subscriptions for delete using (auth.uid() = user_id);
