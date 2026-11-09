import { useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number | string;
  onValueChange: (value: number | "") => void;
};

function formatDraft(value: string) {
  const cleaned = value.replace(/\s/g, "").replace(/[^\d,.]/g, "");
  const separatorIndex = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  const hasSeparator = separatorIndex >= 0;
  const integerSource = hasSeparator ? cleaned.slice(0, separatorIndex) : cleaned;
  const integer = integerSource.replace(/\D/g, "").replace(/^0+(?=\d)/, "") || (hasSeparator || integerSource ? "0" : "");
  const fraction = hasSeparator ? cleaned.slice(separatorIndex + 1).replace(/\D/g, "").slice(0, 2) : "";
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return hasSeparator ? `${groupedInteger},${fraction}` : groupedInteger;
}

function formatValue(value: number | string) {
  if (value === "" || !Number(value)) return "";
  return formatDraft(String(value).replace(".", ","));
}

function numericValue(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  if (!normalized) return "";
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : "";
}

function propNumber(value: number | string) {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function caretPosition(value: string, integerDigits: number, decimalEntered: boolean, fractionDigits: number) {
  let position = 0;
  let seenDigits = 0;
  for (let index = 0; index < value.length; index += 1) {
    position = index + 1;
    if (/\d/.test(value[index])) seenDigits += 1;
    if (integerDigits > 0 && seenDigits >= integerDigits) break;
  }
  if (integerDigits === 0) position = 0;
  if (decimalEntered) {
    const separatorIndex = value.indexOf(",");
    if (separatorIndex >= 0) {
      position = separatorIndex + 1;
      let seenFractionDigits = 0;
      for (let index = separatorIndex + 1; index < value.length; index += 1) {
        if (/\d/.test(value[index])) seenFractionDigits += 1;
        position = index + 1;
        if (seenFractionDigits >= fractionDigits && fractionDigits > 0) break;
      }
    }
  }
  return position;
}

export function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(() => formatValue(value));

  useEffect(() => {
    setDisplayValue((current) => {
      const displayedNumber = numericValue(current);
      const nextNumber = propNumber(value);
      if (displayedNumber === nextNumber || (displayedNumber === "" && nextNumber === 0)) return current;
      return formatValue(value);
    });
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const cursor = event.target.selectionStart ?? rawValue.length;
    const beforeCursor = rawValue.slice(0, cursor);
    const beforeSeparatorIndex = Math.max(beforeCursor.lastIndexOf(","), beforeCursor.lastIndexOf("."));
    const decimalEntered = beforeSeparatorIndex >= 0;
    const integerSource = decimalEntered ? beforeCursor.slice(0, beforeSeparatorIndex) : beforeCursor;
    const integerDigits = integerSource.replace(/\D/g, "").length;
    const fractionDigits = decimalEntered ? beforeCursor.slice(beforeSeparatorIndex + 1).replace(/\D/g, "").length : 0;
    const formatted = formatDraft(rawValue);

    setDisplayValue(formatted);
    onValueChange(numericValue(formatted));
    const nextCursor = caretPosition(formatted, integerDigits, decimalEntered, fractionDigits);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(nextCursor, nextCursor));
  };

  return <input {...props} ref={inputRef} type="text" inputMode="decimal" value={displayValue} onChange={handleChange} />;
}