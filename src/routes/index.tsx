import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Barcode, Download, QrCode, ScanLine } from "lucide-react";

import { ColorField } from "@/components/ColorField";
import { NumberField } from "@/components/NumberField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  contentError,
  isContentValid,
  renderCode128,
  renderQrCode,
  type CodeSettings,
  type CodeType,
} from "@/lib/codegen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Codeflux — Générateur de Code 128 et QR Codes" },
      {
        name: "description",
        content:
          "Générez et exportez en PDF des codes-barres Code 128 et des QR Codes, avec réglages précis en millimètres, couleurs et aperçu en temps réel.",
      },
      { property: "og:title", content: "Codeflux — Générateur de Code 128 et QR Codes" },
      {
        property: "og:description",
        content:
          "Outil en ligne pour créer des codes-barres Code 128 et QR Codes aux dimensions exactes, avec export PDF instantané.",
      },
    ],
  }),
  component: Index,
});

const FONTS = [
  "Helvetica Neue",
  "Arial",
  "Courier New",
  "Verdana",
  "Roboto",
  "Times New Roman",
];

const DEFAULTS = {
  code128: { moduleWidth: 0.347, totalWidth: 35 },
  qrcode: { moduleWidth: 0.952, totalWidth: 20 },
};

function Index() {
  const [type, setType] = useState<CodeType>("code128");
  const [content, setContent] = useState("");
  const [moduleWidth, setModuleWidth] = useState(DEFAULTS.code128.moduleWidth);
  const [totalWidth, setTotalWidth] = useState(DEFAULTS.code128.totalWidth);
  const [moduleHeight, setModuleHeight] = useState(4);
  const [barColor, setBarColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [showText, setShowText] = useState(true);
  const [fontFamily, setFontFamily] = useState("Helvetica Neue");
  const [fontSize, setFontSize] = useState(7);
  const [touched, setTouched] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const settings: CodeSettings = useMemo(
    () => ({
      type,
      content,
      moduleWidth,
      totalWidth,
      moduleHeight,
      barColor,
      bgColor,
      showText,
      fontFamily,
      fontSize,
    }),
    [
      type,
      content,
      moduleWidth,
      totalWidth,
      moduleHeight,
      barColor,
      bgColor,
      showText,
      fontFamily,
      fontSize,
    ],
  );

  const valid = isContentValid(type, content);
  const error = touched ? contentError(type, content) : null;

  const handleTypeChange = (next: string) => {
    const nextType = next as CodeType;
    setType(nextType);
    setModuleWidth(DEFAULTS[nextType].moduleWidth);
    setTotalWidth(DEFAULTS[nextType].totalWidth);
    setTouched(false);
  };

  const handleContentChange = (value: string) => {
    setContent(type === "code128" ? value.slice(0, 9) : value);
    setTouched(true);
  };

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !isContentValid(settings.type, settings.content)) return;
    try {
      if (settings.type === "code128") renderCode128(canvas, settings);
      else await renderQrCode(canvas, settings);
    } catch {
      /* contenu transitoirement non rendu */
    }
  }, [settings]);

  useEffect(() => {
    void draw();
  }, [draw]);

  const exportPdf = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !valid) return;
    const { default: jsPDF } = await import("jspdf");
    const heightMm = (canvas.height / canvas.width) * totalWidth;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 20, 25, totalWidth, heightMm);
    doc.save(`${type === "code128" ? "code128" : "qrcode"}-${Date.now()}.pdf`);
  };

  const isBarcode = type === "code128";

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:px-8">
      <header className="mb-10 flex flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
          <ScanLine className="h-3.5 w-3.5" /> Génération côté client
        </span>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Générateur de codes-barres{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Code 128 &amp; QR Code
          </span>
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          Réglez chaque dimension au millimètre près, prévisualisez en temps réel et exportez
          votre code en PDF, sans aucun envoi de données.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start">
        {/* Formulaire */}
        <section className="glass rounded-2xl p-6 sm:p-8">
          <h2 className="mb-6 text-lg font-semibold">Paramètres</h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Type de code-barres</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger className="border-white/10 bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code128">Code 128</SelectItem>
                  <SelectItem value="qrcode">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <Label htmlFor="content" className="min-w-0 text-sm text-muted-foreground">
                  Contenu
                </Label>
                {isBarcode && (
                  <span
                    className={`shrink-0 font-mono text-xs ${
                      content.length === 9 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {content.length}/9
                  </span>
                )}
              </div>
              <Input
                id="content"
                value={content}
                maxLength={isBarcode ? 9 : undefined}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={isBarcode ? "9 caractères, ex. ABC123456" : "https://exemple.com"}
                aria-invalid={Boolean(error)}
                className="border-white/10 bg-white/5 font-mono"
              />
              {error && <p className="text-xs text-destructive/90">{error}</p>}
            </div>

            <NumberField
              id="moduleWidth"
              label="Largeur du module"
              unit="mm"
              value={moduleWidth}
              onChange={setModuleWidth}
              min={0.1}
              max={3}
              step={0.001}
            />

            <NumberField
              id="totalWidth"
              label={isBarcode ? "Largeur code-barres" : "Largeur du QR Code"}
              unit="mm"
              value={totalWidth}
              onChange={setTotalWidth}
              min={5}
              max={180}
              step={0.5}
            />

            {isBarcode && (
              <div className="animate-fade-in">
                <NumberField
                  id="moduleHeight"
                  label="Hauteur du module"
                  unit="mm"
                  value={moduleHeight}
                  onChange={setModuleHeight}
                  min={1}
                  max={60}
                  step={0.5}
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                id="barColor"
                label="Couleur des barres"
                value={barColor}
                onChange={setBarColor}
              />
              <ColorField
                id="bgColor"
                label="Couleur du fond"
                value={bgColor}
                onChange={setBgColor}
              />
            </div>

            {isBarcode && (
              <div className="animate-fade-in space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">
                    Afficher la ligne de texte
                  </Label>
                  <RadioGroup
                    value={showText ? "oui" : "non"}
                    onValueChange={(v) => setShowText(v === "oui")}
                    className="flex gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="oui" id="text-oui" />
                      <Label htmlFor="text-oui" className="text-sm font-normal">
                        Oui
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="non" id="text-non" />
                      <Label htmlFor="text-non" className="text-sm font-normal">
                        Non
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Police</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="border-white/10 bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <NumberField
                  id="fontSize"
                  label="Taille de police"
                  unit="pt"
                  value={fontSize}
                  onChange={setFontSize}
                  min={4}
                  max={24}
                  step={0.25}
                  decimals={2}
                />
              </div>
            )}
          </div>
        </section>

        {/* Aperçu */}
        <section className="lg:sticky lg:top-8">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="min-w-0 truncate text-lg font-semibold">Prévisualisation</h2>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-muted-foreground">
                {totalWidth.toFixed(3)} mm
              </span>
            </div>

            <div className="flex min-h-56 items-center justify-center overflow-auto rounded-xl border border-white/10 bg-[repeating-conic-gradient(oklch(1_0_0_/_4%)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-6">
              {valid ? (
                <canvas
                  ref={canvasRef}
                  className="h-auto max-w-full animate-fade-in rounded-sm shadow-lg"
                  style={{ width: `${totalWidth}mm` }}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
                  {isBarcode ? (
                    <Barcode className="h-10 w-10 opacity-40" />
                  ) : (
                    <QrCode className="h-10 w-10 opacity-40" />
                  )}
                  <p className="max-w-56 text-sm">
                    {isBarcode
                      ? "Saisissez 9 caractères pour voir apparaître votre Code 128."
                      : "Saisissez une URL valide pour voir apparaître votre QR Code."}
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={exportPdf}
              disabled={!valid}
              className="mt-6 w-full bg-gradient-to-r from-primary to-accent font-semibold text-primary-foreground transition-all duration-300 hover:opacity-95 hover:glow-neon disabled:opacity-40"
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter en PDF
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Le PDF reprend exactement les dimensions définies ci-contre.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
