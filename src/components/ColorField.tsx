import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function ColorField({ id, label, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1.5 transition-colors focus-within:border-primary/60">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-white/15 bg-transparent p-0.5"
        />
        <Input
          value={value.toUpperCase()}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange(v.startsWith("#") ? v : `#${v}`);
          }}
          maxLength={7}
          className="h-9 border-0 bg-transparent font-mono text-sm uppercase shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
