import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type Props = {
  id: string;
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  decimals?: number;
};

export function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  decimals = 3,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Label htmlFor={id} className="min-w-0 truncate text-sm text-muted-foreground">
          {label}
        </Label>
        <div className="flex shrink-0 items-center gap-2">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(value) ? value : ""}
            onChange={(e) => onChange(Number.parseFloat(e.target.value))}
            className="h-9 w-24 border-white/10 bg-white/5 text-right font-mono text-sm tabular-nums"
          />
          <span className="w-6 text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <Slider
        value={[Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(Number.parseFloat(v.toFixed(decimals)))}
        aria-label={label}
      />
    </div>
  );
}
