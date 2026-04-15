CREATE OR REPLACE FUNCTION public.sanitize_user_progress_mode_data(payload jsonb)
RETURNS jsonb
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'displayName',
      CASE
        WHEN jsonb_typeof(payload->'displayName') = 'string'
          AND nullif(btrim(payload->>'displayName'), '') IS NOT NULL
        THEN to_jsonb(left(btrim(payload->>'displayName'), 64))
        ELSE NULL
      END,
      'hideoutModules',
      CASE
        WHEN jsonb_typeof(payload->'hideoutModules') = 'object'
        THEN payload->'hideoutModules'
        ELSE '{}'::jsonb
      END,
      'hideoutParts',
      CASE
        WHEN jsonb_typeof(payload->'hideoutParts') = 'object'
        THEN payload->'hideoutParts'
        ELSE '{}'::jsonb
      END,
      'lastApiUpdate',
      CASE
        WHEN jsonb_typeof(payload->'lastApiUpdate') = 'object'
        THEN payload->'lastApiUpdate'
        ELSE NULL
      END,
      'apiUpdateHistory',
      CASE
        WHEN jsonb_typeof(payload->'apiUpdateHistory') = 'array'
        THEN (
          SELECT COALESCE(jsonb_agg(entry.value), '[]'::jsonb)
          FROM (
            SELECT value
            FROM jsonb_array_elements(payload->'apiUpdateHistory')
            LIMIT 50
          ) AS entry
        )
        ELSE '[]'::jsonb
      END,
      'level',
      CASE
        WHEN jsonb_typeof(payload->'level') = 'number'
        THEN to_jsonb(
          greatest(
            1,
            least(
              2147483647,
              greatest(-2147483648, trunc((payload->>'level')::numeric))
            )::int
          )
        )
        ELSE NULL
      END,
      'pmcFaction',
      CASE
        WHEN payload->>'pmcFaction' IN ('BEAR', 'USEC')
        THEN to_jsonb(payload->>'pmcFaction')
        ELSE NULL
      END,
      'prestigeLevel',
      CASE
        WHEN jsonb_typeof(payload->'prestigeLevel') = 'number'
        THEN to_jsonb(
          least(
            6,
            greatest(
              0,
              least(
                2147483647,
                greatest(-2147483648, trunc((payload->>'prestigeLevel')::numeric))
              )::int
            )
          )
        )
        ELSE NULL
      END,
      'progressEpoch',
      CASE
        WHEN jsonb_typeof(payload->'progressEpoch') = 'number'
        THEN to_jsonb(
          greatest(
            0,
            least(
              2147483647,
              greatest(-2147483648, trunc((payload->>'progressEpoch')::numeric))
            )::int
          )
        )
        ELSE to_jsonb(0)
      END,
      'skillOffsets',
      CASE
        WHEN jsonb_typeof(payload->'skillOffsets') = 'object'
        THEN payload->'skillOffsets'
        ELSE '{}'::jsonb
      END,
      'skills',
      CASE
        WHEN jsonb_typeof(payload->'skills') = 'object'
        THEN payload->'skills'
        ELSE '{}'::jsonb
      END,
      'storyChapters',
      CASE
        WHEN jsonb_typeof(payload->'storyChapters') = 'object'
        THEN payload->'storyChapters'
        ELSE '{}'::jsonb
      END,
      'taskCompletions',
      CASE
        WHEN jsonb_typeof(payload->'taskCompletions') = 'object'
        THEN payload->'taskCompletions'
        ELSE '{}'::jsonb
      END,
      'taskObjectives',
      CASE
        WHEN jsonb_typeof(payload->'taskObjectives') = 'object'
        THEN payload->'taskObjectives'
        ELSE '{}'::jsonb
      END,
      'traders',
      CASE
        WHEN jsonb_typeof(payload->'traders') = 'object'
        THEN payload->'traders'
        ELSE '{}'::jsonb
      END,
      'xpOffset',
      CASE
        WHEN jsonb_typeof(payload->'xpOffset') = 'number'
        THEN to_jsonb(
          least(
            2147483647,
            greatest(-2147483648, trunc((payload->>'xpOffset')::numeric))
          )::int
        )
        ELSE NULL
      END
    )
  );
$$;

DO $$
DECLARE
  sanitized jsonb;
BEGIN
  sanitized := public.sanitize_user_progress_mode_data(
    jsonb_build_object(
      'displayName',
      '  Cleanup Tester  ',
      'level',
      7,
      'pmcFaction',
      'USEC',
      'prestigeLevel',
      2,
      'progressEpoch',
      3,
      'skills',
      jsonb_build_object('Endurance', 10),
      'tarkovDevProfile',
      jsonb_build_object('aid', 12345, 'importedAt', 1730000000),
      'taskCompletions',
      jsonb_build_object('task', jsonb_build_object('complete', true))
    )
  );

  IF sanitized->>'displayName' <> 'Cleanup Tester' THEN
    RAISE EXCEPTION
      'sanitize_user_progress_mode_data regression: displayName not trimmed as expected';
  END IF;

  IF sanitized ? 'tarkovDevProfile' THEN
    RAISE EXCEPTION
      'sanitize_user_progress_mode_data regression: tarkovDevProfile should not be preserved';
  END IF;
END;
$$;

UPDATE public.user_progress
SET
  pvp_data = public.sanitize_user_progress_mode_data(COALESCE(pvp_data, '{}'::jsonb)),
  pve_data = public.sanitize_user_progress_mode_data(COALESCE(pve_data, '{}'::jsonb))
WHERE
  COALESCE(pvp_data, '{}'::jsonb) ? 'tarkovDevProfile'
  OR COALESCE(pve_data, '{}'::jsonb) ? 'tarkovDevProfile';
