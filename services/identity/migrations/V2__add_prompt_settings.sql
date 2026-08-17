CREATE TABLE user_prompt_settings (
  user_id uuid NOT NULL REFERENCES users(id),
  section text NOT NULL,
  prompt_text text NOT NULL DEFAULT '' CHECK (char_length(prompt_text) <= 500),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section)
);
