-- ============================================
-- Exercise Catalog Seed Data
-- ============================================

INSERT INTO public.exercise_catalog (name_ko, name_en, muscle_group_primary, muscle_groups_secondary, equipment, movement_pattern, is_compound) VALUES
-- Chest
('바벨 벤치 프레스', 'Barbell Bench Press', 'chest', ARRAY['triceps', 'front_delts'], 'barbell', 'horizontal_push', true),
('인클라인 바벨 벤치 프레스', 'Incline Barbell Bench Press', 'chest', ARRAY['triceps', 'front_delts'], 'barbell', 'incline_push', true),
('덤벨 벤치 프레스', 'Dumbbell Bench Press', 'chest', ARRAY['triceps', 'front_delts'], 'dumbbell', 'horizontal_push', true),
('인클라인 덤벨 벤치 프레스', 'Incline Dumbbell Bench Press', 'chest', ARRAY['triceps', 'front_delts'], 'dumbbell', 'incline_push', true),
('덤벨 플라이', 'Dumbbell Fly', 'chest', ARRAY['front_delts'], 'dumbbell', 'horizontal_adduction', false),
('케이블 크로스오버', 'Cable Crossover', 'chest', ARRAY['front_delts'], 'cable', 'horizontal_adduction', false),
('머신 체스트 프레스', 'Machine Chest Press', 'chest', ARRAY['triceps', 'front_delts'], 'machine', 'horizontal_push', true),
('인클라인 머신 프레스', 'Incline Machine Press', 'chest', ARRAY['triceps', 'front_delts'], 'machine', 'incline_push', true),
('딥스', 'Dips', 'chest', ARRAY['triceps', 'front_delts'], 'bodyweight', 'vertical_push', true),
('펙 덱', 'Pec Deck', 'chest', ARRAY[]::text[], 'machine', 'horizontal_adduction', false),

-- Back
('바벨 로우', 'Barbell Row', 'back', ARRAY['biceps', 'rear_delts'], 'barbell', 'horizontal_pull', true),
('덤벨 로우', 'Dumbbell Row', 'back', ARRAY['biceps', 'rear_delts'], 'dumbbell', 'horizontal_pull', true),
('랫 풀다운', 'Lat Pulldown', 'back', ARRAY['biceps'], 'cable', 'vertical_pull', true),
('풀업', 'Pull-Up', 'back', ARRAY['biceps'], 'bodyweight', 'vertical_pull', true),
('어시스티드 풀업', 'Assisted Pull-Up', 'back', ARRAY['biceps'], 'machine', 'vertical_pull', true),
('시티드 케이블 로우', 'Seated Cable Row', 'back', ARRAY['biceps', 'rear_delts'], 'cable', 'horizontal_pull', true),
('데드리프트', 'Deadlift', 'back', ARRAY['glutes', 'hamstrings', 'core'], 'barbell', 'hinge', true),
('티바 로우', 'T-Bar Row', 'back', ARRAY['biceps', 'rear_delts'], 'barbell', 'horizontal_pull', true),
('머신 로우', 'Machine Row', 'back', ARRAY['biceps', 'rear_delts'], 'machine', 'horizontal_pull', true),

-- Legs
('바벨 스쿼트', 'Barbell Squat', 'quads', ARRAY['glutes', 'hamstrings', 'core'], 'barbell', 'squat', true),
('프론트 스쿼트', 'Front Squat', 'quads', ARRAY['glutes', 'core'], 'barbell', 'squat', true),
('레그 프레스', 'Leg Press', 'quads', ARRAY['glutes', 'hamstrings'], 'machine', 'squat', true),
('레그 익스텐션', 'Leg Extension', 'quads', ARRAY[]::text[], 'machine', 'knee_extension', false),
('레그 컬', 'Leg Curl', 'hamstrings', ARRAY[]::text[], 'machine', 'knee_flexion', false),
('루마니안 데드리프트', 'Romanian Deadlift', 'hamstrings', ARRAY['glutes', 'back'], 'barbell', 'hinge', true),
('불가리안 스플릿 스쿼트', 'Bulgarian Split Squat', 'quads', ARRAY['glutes'], 'dumbbell', 'lunge', true),
('카프 레이즈', 'Calf Raise', 'calves', ARRAY[]::text[], 'machine', 'ankle_extension', false),
('힙 쓰러스트', 'Hip Thrust', 'glutes', ARRAY['hamstrings'], 'barbell', 'hip_extension', true),
('런지', 'Lunge', 'quads', ARRAY['glutes'], 'dumbbell', 'lunge', true),
('핵 스쿼트', 'Hack Squat', 'quads', ARRAY['glutes'], 'machine', 'squat', true),

-- Shoulders
('오버헤드 프레스', 'Overhead Press', 'shoulders', ARRAY['triceps'], 'barbell', 'vertical_push', true),
('덤벨 숄더 프레스', 'Dumbbell Shoulder Press', 'shoulders', ARRAY['triceps'], 'dumbbell', 'vertical_push', true),
('머신 숄더 프레스', 'Machine Shoulder Press', 'shoulders', ARRAY['triceps'], 'machine', 'vertical_push', true),
('사이드 레터럴 레이즈', 'Side Lateral Raise', 'shoulders', ARRAY[]::text[], 'dumbbell', 'lateral_raise', false),
('페이스 풀', 'Face Pull', 'rear_delts', ARRAY['traps'], 'cable', 'horizontal_pull', false),
('리버스 펙 덱', 'Reverse Pec Deck', 'rear_delts', ARRAY[]::text[], 'machine', 'horizontal_pull', false),
('프론트 레이즈', 'Front Raise', 'front_delts', ARRAY[]::text[], 'dumbbell', 'frontal_raise', false),
('업라이트 로우', 'Upright Row', 'shoulders', ARRAY['traps'], 'barbell', 'upright_pull', true),

-- Arms
('바벨 컬', 'Barbell Curl', 'biceps', ARRAY[]::text[], 'barbell', 'elbow_flexion', false),
('덤벨 컬', 'Dumbbell Curl', 'biceps', ARRAY[]::text[], 'dumbbell', 'elbow_flexion', false),
('해머 컬', 'Hammer Curl', 'biceps', ARRAY['brachioradialis'], 'dumbbell', 'elbow_flexion', false),
('케이블 컬', 'Cable Curl', 'biceps', ARRAY[]::text[], 'cable', 'elbow_flexion', false),
('트라이셉 푸시다운', 'Tricep Pushdown', 'triceps', ARRAY[]::text[], 'cable', 'elbow_extension', false),
('스컬 크러셔', 'Skull Crusher', 'triceps', ARRAY[]::text[], 'barbell', 'elbow_extension', false),
('오버헤드 트라이셉 익스텐션', 'Overhead Tricep Extension', 'triceps', ARRAY[]::text[], 'cable', 'elbow_extension', false),

-- Core
('플랭크', 'Plank', 'core', ARRAY[]::text[], 'bodyweight', 'anti_extension', false),
('행잉 레그 레이즈', 'Hanging Leg Raise', 'core', ARRAY['hip_flexors'], 'bodyweight', 'hip_flexion', false),
('케이블 크런치', 'Cable Crunch', 'core', ARRAY[]::text[], 'cable', 'spinal_flexion', false),
('앱 롤아웃', 'Ab Rollout', 'core', ARRAY[]::text[], 'bodyweight', 'anti_extension', false);

-- ============================================
-- Garmin Exercise Aliases
-- ============================================
INSERT INTO public.exercise_aliases (exercise_id, alias, source)
SELECT id, name_en, 'garmin' FROM public.exercise_catalog;

-- Common Garmin exercise key variations
INSERT INTO public.exercise_aliases (exercise_id, alias, source)
SELECT id, UPPER(REPLACE(name_en, ' ', '_')), 'garmin' FROM public.exercise_catalog;
