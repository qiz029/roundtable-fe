import { X } from "lucide-react";
import { mergePillValues, pillToneClass, splitPillText } from "../lib/pills";

type PillProps = {
  value: string;
  prefix?: string;
  onRemove?: () => void;
};

type PillInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  ariaLabel: string;
  prefix?: string;
};

export function Pill({ value, prefix = "", onRemove }: PillProps) {
  return (
    <span className={`pill ${pillToneClass(value)}`}>
      <span>
        {prefix}
        {value}
      </span>
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label={`Remove ${value}`}>
          <X size={12} />
        </button>
      ) : null}
    </span>
  );
}

export function PillList({ values, prefix = "" }: { values: string[]; prefix?: string }) {
  if (values.length === 0) return null;

  return (
    <div className="pillRow">
      {values.map((value, index) => (
        <Pill value={value} prefix={prefix} key={`${value}-${index}`} />
      ))}
    </div>
  );
}

export function PillInput({ value, onChange, placeholder, ariaLabel, prefix = "" }: PillInputProps) {
  function addValues(rawValue: string) {
    const nextValues = splitPillText(rawValue);
    if (nextValues.length === 0) return;
    onChange(mergePillValues(value, nextValues));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="pillInput" onClick={(event) => event.currentTarget.querySelector("input")?.focus()}>
      {value.map((item, index) => (
        <Pill value={item} prefix={prefix} key={`${item}-${index}`} onRemove={() => removeAt(index)} />
      ))}
      <input
        aria-label={ariaLabel}
        placeholder={value.length === 0 ? placeholder : undefined}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (/[\s,]/.test(nextValue)) {
            addValues(nextValue);
            event.target.value = "";
            return;
          }

          event.target.value = nextValue;
        }}
        onKeyDown={(event) => {
          const input = event.currentTarget;
          if (event.key === "Enter" || event.key === "Tab" || event.key === "," || event.key === " ") {
            if (input.value.trim()) {
              event.preventDefault();
              addValues(input.value);
              input.value = "";
            }
            return;
          }

          if (event.key === "Backspace" && !input.value && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onPaste={(event) => {
          const pastedText = event.clipboardData.getData("text");
          if (!pastedText) return;

          event.preventDefault();
          addValues(pastedText);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
