-- =====================================================
-- SEED DATA — Matchs Coupe du Monde 2026
-- FORMAT OFFICIEL : 12 groupes de 4 équipes
-- 6 matchs par groupe (round-robin) = 72 matchs de groupes
-- + 32 matchs de phase finale = 104 matchs total
-- =====================================================

TRUNCATE TABLE matches RESTART IDENTITY CASCADE;

INSERT INTO matches (home_team, away_team, home_flag, away_flag, kickoff_at, stage) VALUES

-- =====================================================
-- GROUPE A : États-Unis, Panama, Qatar, Nouvelle-Zélande
-- =====================================================
('États-Unis',      'Panama',           '🇺🇸','🇵🇦', '2026-06-11 15:00:00-05', 'Groupe A'),
('Qatar',           'Nouvelle-Zélande', '🇶🇦','🇳🇿', '2026-06-11 19:00:00-05', 'Groupe A'),
('États-Unis',      'Qatar',            '🇺🇸','🇶🇦', '2026-06-16 15:00:00-05', 'Groupe A'),
('Panama',          'Nouvelle-Zélande', '🇵🇦','🇳🇿', '2026-06-16 19:00:00-05', 'Groupe A'),
('États-Unis',      'Nouvelle-Zélande', '🇺🇸','🇳🇿', '2026-06-21 19:00:00-05', 'Groupe A'),
('Panama',          'Qatar',            '🇵🇦','🇶🇦', '2026-06-21 19:00:00-05', 'Groupe A'),

-- =====================================================
-- GROUPE B : Mexique, Honduras, Costa Rica, Iran
-- =====================================================
('Mexique',         'Honduras',         '🇲🇽','🇭🇳', '2026-06-12 12:00:00-05', 'Groupe B'),
('Costa Rica',      'Iran',             '🇨🇷','🇮🇷', '2026-06-12 16:00:00-05', 'Groupe B'),
('Mexique',         'Iran',             '🇲🇽','🇮🇷', '2026-06-17 12:00:00-05', 'Groupe B'),
('Honduras',        'Costa Rica',       '🇭🇳','🇨🇷', '2026-06-17 16:00:00-05', 'Groupe B'),
('Mexique',         'Costa Rica',       '🇲🇽','🇨🇷', '2026-06-22 16:00:00-05', 'Groupe B'),
('Honduras',        'Iran',             '🇭🇳','🇮🇷', '2026-06-22 16:00:00-05', 'Groupe B'),

-- =====================================================
-- GROUPE C : Canada, Équateur, Pérou, Chili
-- =====================================================
('Canada',          'Équateur',         '🇨🇦','🇪🇨', '2026-06-12 19:00:00-05', 'Groupe C'),
('Pérou',           'Chili',            '🇵🇪','🇨🇱', '2026-06-12 23:00:00-05', 'Groupe C'),
('Canada',          'Pérou',            '🇨🇦','🇵🇪', '2026-06-17 19:00:00-05', 'Groupe C'),
('Équateur',        'Chili',            '🇪🇨','🇨🇱', '2026-06-17 23:00:00-05', 'Groupe C'),
('Canada',          'Chili',            '🇨🇦','🇨🇱', '2026-06-22 19:00:00-05', 'Groupe C'),
('Équateur',        'Pérou',            '🇪🇨','🇵🇪', '2026-06-22 19:00:00-05', 'Groupe C'),

-- =====================================================
-- GROUPE D : Argentine, Uruguay, Colombie, Brésil
-- =====================================================
('Argentine',       'Uruguay',          '🇦🇷','🇺🇾', '2026-06-13 12:00:00-05', 'Groupe D'),
('Colombie',        'Brésil',           '🇨🇴','🇧🇷', '2026-06-13 16:00:00-05', 'Groupe D'),
('Argentine',       'Colombie',         '🇦🇷','🇨🇴', '2026-06-18 12:00:00-05', 'Groupe D'),
('Uruguay',         'Brésil',           '🇺🇾','🇧🇷', '2026-06-18 16:00:00-05', 'Groupe D'),
('Argentine',       'Brésil',           '🇦🇷','🇧🇷', '2026-06-23 16:00:00-05', 'Groupe D'),
('Uruguay',         'Colombie',         '🇺🇾','🇨🇴', '2026-06-23 16:00:00-05', 'Groupe D'),

-- =====================================================
-- GROUPE E : France, Algérie, Sénégal, Ghana
-- =====================================================
('France',          'Algérie',          '🇫🇷','🇩🇿', '2026-06-13 19:00:00-05', 'Groupe E'),
('Sénégal',         'Ghana',            '🇸🇳','🇬🇭', '2026-06-13 23:00:00-05', 'Groupe E'),
('France',          'Sénégal',          '🇫🇷','🇸🇳', '2026-06-18 19:00:00-05', 'Groupe E'),
('Algérie',         'Ghana',            '🇩🇿','🇬🇭', '2026-06-18 23:00:00-05', 'Groupe E'),
('France',          'Ghana',            '🇫🇷','🇬🇭', '2026-06-23 19:00:00-05', 'Groupe E'),
('Algérie',         'Sénégal',          '🇩🇿','🇸🇳', '2026-06-23 19:00:00-05', 'Groupe E'),

-- =====================================================
-- GROUPE F : Allemagne, Arabie Saoudite, Japon, Australie
-- =====================================================
('Allemagne',       'Arabie Saoudite',  '🇩🇪','🇸🇦', '2026-06-14 12:00:00-05', 'Groupe F'),
('Japon',           'Australie',        '🇯🇵','🇦🇺', '2026-06-14 16:00:00-05', 'Groupe F'),
('Allemagne',       'Japon',            '🇩🇪','🇯🇵', '2026-06-19 12:00:00-05', 'Groupe F'),
('Arabie Saoudite', 'Australie',        '🇸🇦','🇦🇺', '2026-06-19 16:00:00-05', 'Groupe F'),
('Allemagne',       'Australie',        '🇩🇪','🇦🇺', '2026-06-24 16:00:00-05', 'Groupe F'),
('Arabie Saoudite', 'Japon',            '🇸🇦','🇯🇵', '2026-06-24 16:00:00-05', 'Groupe F'),

-- =====================================================
-- GROUPE G : Espagne, Maroc, Tunisie, Égypte
-- =====================================================
('Espagne',         'Maroc',            '🇪🇸','🇲🇦', '2026-06-14 19:00:00-05', 'Groupe G'),
('Tunisie',         'Égypte',           '🇹🇳','🇪🇬', '2026-06-14 23:00:00-05', 'Groupe G'),
('Espagne',         'Tunisie',          '🇪🇸','🇹🇳', '2026-06-19 19:00:00-05', 'Groupe G'),
('Maroc',           'Égypte',           '🇲🇦','🇪🇬', '2026-06-19 23:00:00-05', 'Groupe G'),
('Espagne',         'Égypte',           '🇪🇸','🇪🇬', '2026-06-24 19:00:00-05', 'Groupe G'),
('Maroc',           'Tunisie',          '🇲🇦','🇹🇳', '2026-06-24 19:00:00-05', 'Groupe G'),

-- =====================================================
-- GROUPE H : Portugal, Serbie, Géorgie, Suède
-- =====================================================
('Portugal',        'Serbie',           '🇵🇹','🇷🇸', '2026-06-15 12:00:00-05', 'Groupe H'),
('Géorgie',         'Suède',            '🇬🇪','🇸🇪', '2026-06-15 16:00:00-05', 'Groupe H'),
('Portugal',        'Géorgie',          '🇵🇹','🇬🇪', '2026-06-20 12:00:00-05', 'Groupe H'),
('Serbie',          'Suède',            '🇷🇸','🇸🇪', '2026-06-20 16:00:00-05', 'Groupe H'),
('Portugal',        'Suède',            '🇵🇹','🇸🇪', '2026-06-25 16:00:00-05', 'Groupe H'),
('Serbie',          'Géorgie',          '🇷🇸','🇬🇪', '2026-06-25 16:00:00-05', 'Groupe H'),

-- =====================================================
-- GROUPE I : Angleterre, Cameroun, Nigeria, Écosse
-- =====================================================
('Angleterre',      'Cameroun',         '🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇨🇲', '2026-06-15 19:00:00-05', 'Groupe I'),
('Nigeria',         'Écosse',           '🇳🇬','🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-15 23:00:00-05', 'Groupe I'),
('Angleterre',      'Nigeria',          '🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇳🇬', '2026-06-20 19:00:00-05', 'Groupe I'),
('Cameroun',        'Écosse',           '🇨🇲','🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-20 23:00:00-05', 'Groupe I'),
('Angleterre',      'Écosse',           '🏴󠁧󠁢󠁥󠁮󠁧󠁿','🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-25 19:00:00-05', 'Groupe I'),
('Cameroun',        'Nigeria',          '🇨🇲','🇳🇬', '2026-06-25 19:00:00-05', 'Groupe I'),

-- =====================================================
-- GROUPE J : Italie, Corée du Sud, Croatie, Slovaquie
-- =====================================================
('Italie',          'Corée du Sud',     '🇮🇹','🇰🇷', '2026-06-13 12:00:00-05', 'Groupe J'),
('Croatie',         'Slovaquie',        '🇭🇷','🇸🇰', '2026-06-13 16:00:00-05', 'Groupe J'),
('Italie',          'Croatie',          '🇮🇹','🇭🇷', '2026-06-18 12:00:00-05', 'Groupe J'),
('Corée du Sud',    'Slovaquie',        '🇰🇷','🇸🇰', '2026-06-18 16:00:00-05', 'Groupe J'),
('Italie',          'Slovaquie',        '🇮🇹','🇸🇰', '2026-06-23 12:00:00-05', 'Groupe J'),
('Corée du Sud',    'Croatie',          '🇰🇷','🇭🇷', '2026-06-23 12:00:00-05', 'Groupe J'),

-- =====================================================
-- GROUPE K : Pays-Bas, Pologne, Ukraine, Autriche
-- =====================================================
('Pays-Bas',        'Pologne',          '🇳🇱','🇵🇱', '2026-06-14 12:00:00-05', 'Groupe K'),
('Ukraine',         'Autriche',         '🇺🇦','🇦🇹', '2026-06-14 16:00:00-05', 'Groupe K'),
('Pays-Bas',        'Ukraine',          '🇳🇱','🇺🇦', '2026-06-19 12:00:00-05', 'Groupe K'),
('Pologne',         'Autriche',         '🇵🇱','🇦🇹', '2026-06-19 16:00:00-05', 'Groupe K'),
('Pays-Bas',        'Autriche',         '🇳🇱','🇦🇹', '2026-06-24 12:00:00-05', 'Groupe K'),
('Pologne',         'Ukraine',          '🇵🇱','🇺🇦', '2026-06-24 12:00:00-05', 'Groupe K'),

-- =====================================================
-- GROUPE L : Belgique, Danemark, Suisse, Tchéquie
-- =====================================================
('Belgique',        'Danemark',         '🇧🇪','🇩🇰', '2026-06-15 12:00:00-05', 'Groupe L'),
('Suisse',          'Tchéquie',         '🇨🇭','🇨🇿', '2026-06-15 16:00:00-05', 'Groupe L'),
('Belgique',        'Suisse',           '🇧🇪','🇨🇭', '2026-06-20 12:00:00-05', 'Groupe L'),
('Danemark',        'Tchéquie',         '🇩🇰','🇨🇿', '2026-06-20 16:00:00-05', 'Groupe L'),
('Belgique',        'Tchéquie',         '🇧🇪','🇨🇿', '2026-06-25 12:00:00-05', 'Groupe L'),
('Danemark',        'Suisse',           '🇩🇰','🇨🇭', '2026-06-25 12:00:00-05', 'Groupe L'),

-- =====================================================
-- PHASE FINALE — 32 matchs
-- 16 matchs Huitièmes + 8 Quarts + 4 Demis + 1 Petite finale + 1 Finale
-- =====================================================

-- Huitièmes de finale (16 matchs — 29 juin au 4 juillet 2026)
('1er Groupe A',    '2e Groupe B',      '🏳️','🏳️', '2026-06-29 15:00:00-05', '1/8 finale'),
('1er Groupe C',    '2e Groupe D',      '🏳️','🏳️', '2026-06-29 19:00:00-05', '1/8 finale'),
('1er Groupe E',    '2e Groupe F',      '🏳️','🏳️', '2026-06-30 15:00:00-05', '1/8 finale'),
('1er Groupe G',    '2e Groupe H',      '🏳️','🏳️', '2026-06-30 19:00:00-05', '1/8 finale'),
('1er Groupe I',    '2e Groupe J',      '🏳️','🏳️', '2026-07-01 15:00:00-05', '1/8 finale'),
('1er Groupe K',    '2e Groupe L',      '🏳️','🏳️', '2026-07-01 19:00:00-05', '1/8 finale'),
('1er Groupe B',    '2e Groupe A',      '🏳️','🏳️', '2026-07-02 15:00:00-05', '1/8 finale'),
('1er Groupe D',    '2e Groupe C',      '🏳️','🏳️', '2026-07-02 19:00:00-05', '1/8 finale'),
('1er Groupe F',    '2e Groupe E',      '🏳️','🏳️', '2026-07-03 12:00:00-05', '1/8 finale'),
('1er Groupe H',    '2e Groupe G',      '🏳️','🏳️', '2026-07-03 16:00:00-05', '1/8 finale'),
('1er Groupe J',    '2e Groupe I',      '🏳️','🏳️', '2026-07-03 20:00:00-05', '1/8 finale'),
('1er Groupe L',    '2e Groupe K',      '🏳️','🏳️', '2026-07-04 12:00:00-05', '1/8 finale'),
('Meilleur 3e #1',  'Meilleur 3e #2',   '🏳️','🏳️', '2026-07-04 16:00:00-05', '1/8 finale'),
('Meilleur 3e #3',  'Meilleur 3e #4',   '🏳️','🏳️', '2026-07-04 20:00:00-05', '1/8 finale'),
('Meilleur 3e #5',  'Meilleur 3e #6',   '🏳️','🏳️', '2026-07-05 15:00:00-05', '1/8 finale'),
('Meilleur 3e #7',  'Meilleur 3e #8',   '🏳️','🏳️', '2026-07-05 19:00:00-05', '1/8 finale'),

-- Quarts de finale (8 matchs — 7-10 juillet 2026)
('Qualifié QF #1',  'Qualifié QF #2',   '🏳️','🏳️', '2026-07-07 15:00:00-05', 'Quart de finale'),
('Qualifié QF #3',  'Qualifié QF #4',   '🏳️','🏳️', '2026-07-07 19:00:00-05', 'Quart de finale'),
('Qualifié QF #5',  'Qualifié QF #6',   '🏳️','🏳️', '2026-07-08 15:00:00-05', 'Quart de finale'),
('Qualifié QF #7',  'Qualifié QF #8',   '🏳️','🏳️', '2026-07-08 19:00:00-05', 'Quart de finale'),
('Qualifié QF #9',  'Qualifié QF #10',  '🏳️','🏳️', '2026-07-09 15:00:00-05', 'Quart de finale'),
('Qualifié QF #11', 'Qualifié QF #12',  '🏳️','🏳️', '2026-07-09 19:00:00-05', 'Quart de finale'),
('Qualifié QF #13', 'Qualifié QF #14',  '🏳️','🏳️', '2026-07-10 15:00:00-05', 'Quart de finale'),
('Qualifié QF #15', 'Qualifié QF #16',  '🏳️','🏳️', '2026-07-10 19:00:00-05', 'Quart de finale'),

-- Demi-finales (4 matchs — 13-14 juillet 2026)
('Qualifié SF #1',  'Qualifié SF #2',   '🏳️','🏳️', '2026-07-13 19:00:00-05', 'Demi-finale'),
('Qualifié SF #3',  'Qualifié SF #4',   '🏳️','🏳️', '2026-07-14 19:00:00-05', 'Demi-finale'),
('Qualifié SF #5',  'Qualifié SF #6',   '🏳️','🏳️', '2026-07-15 19:00:00-05', 'Demi-finale'),
('Qualifié SF #7',  'Qualifié SF #8',   '🏳️','🏳️', '2026-07-16 19:00:00-05', 'Demi-finale'),

-- Petite finale — 3e place (18 juillet 2026)
('Perdant SF #1',   'Perdant SF #2',    '🏳️','🏳️', '2026-07-18 16:00:00-05', 'Petite finale'),

-- FINALE (19 juillet 2026 — MetLife Stadium, New York)
('Finaliste #1',    'Finaliste #2',     '🏳️','🏳️', '2026-07-19 17:00:00-05', 'Finale');

-- Vérification finale
SELECT stage, COUNT(*) as nb_matchs
FROM matches
GROUP BY stage
ORDER BY MIN(kickoff_at);
