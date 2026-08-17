package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/promptsettings"
)

// PromptSettingsRepository implements promptsettings.Repository over
// PostgreSQL.
type PromptSettingsRepository struct {
	pool *pgxpool.Pool
}

// NewPromptSettingsRepository returns a PromptSettingsRepository.
func NewPromptSettingsRepository(pool *pgxpool.Pool) *PromptSettingsRepository {
	return &PromptSettingsRepository{pool: pool}
}

func (r *PromptSettingsRepository) List(ctx context.Context, userID uuid.UUID) ([]promptsettings.Setting, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT user_id, section, prompt_text, updated_at
		FROM user_prompt_settings
		WHERE user_id = $1
		ORDER BY section
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []promptsettings.Setting
	for rows.Next() {
		s, err := scanPromptSetting(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *PromptSettingsRepository) Upsert(ctx context.Context, userID uuid.UUID, section, promptText string) (promptsettings.Setting, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO user_prompt_settings (user_id, section, prompt_text, updated_at)
		VALUES ($1, $2, $3, now())
		ON CONFLICT (user_id, section)
		DO UPDATE SET prompt_text = EXCLUDED.prompt_text, updated_at = now()
		RETURNING user_id, section, prompt_text, updated_at
	`, userID, section, promptText)
	return scanPromptSetting(row)
}

func scanPromptSetting(row rowScanner) (promptsettings.Setting, error) {
	var s promptsettings.Setting
	err := row.Scan(&s.UserID, &s.Section, &s.PromptText, &s.UpdatedAt)
	if err != nil {
		return promptsettings.Setting{}, err
	}
	return s, nil
}
