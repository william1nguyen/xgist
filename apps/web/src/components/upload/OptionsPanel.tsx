import type { ProcessingOptions } from "@repo/types"
import { CREDIT_COSTS } from "@xgist/config"

type OptionsPanelProps = {
  options: ProcessingOptions
  onChange: (options: ProcessingOptions) => void
}

type OptionRow = {
  key: keyof ProcessingOptions
  label: string
  disabled?: boolean
}

const OPTION_ROWS: OptionRow[] = [
  { key: "transcribe", label: "Transcribe", disabled: true },
  { key: "summarize", label: "Summarize" },
  { key: "extractKeywords", label: "Extract Keywords" },
  { key: "extractMainIdeas", label: "Extract Main Ideas" },
  { key: "generateNotes", label: "Generate Notes" },
  { key: "generateAudioSummary", label: "Generate Audio Summary" },
]

export default function OptionsPanel({ options, onChange }: OptionsPanelProps) {
  const toggle = (key: keyof ProcessingOptions) => {
    onChange({ ...options, [key]: !options[key] })
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium">AI Processing Options</p>
      </div>
      <div className="divide-y divide-border">
        {OPTION_ROWS.map(({ key, label, disabled }) => (
          <div key={key} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={options[key]}
                disabled={disabled}
                onClick={() => !disabled && toggle(key)}
                className={[
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  options[key] ? "bg-primary" : "bg-input",
                  disabled ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                    options[key] ? "translate-x-4" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
              <span className="text-sm">{label}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {CREDIT_COSTS[key as keyof typeof CREDIT_COSTS]} credits
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
