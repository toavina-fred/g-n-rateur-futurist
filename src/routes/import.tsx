import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  Barcode,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Play,
  QrCode,
  Square,
  Upload,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FORMAT_ERROR,
  generatePdfBlob,
  parseExcel,
  safeFileName,
  type ParsedRow,
} from "@/lib/batch";
import type { CodeType } from "@/lib/codegen";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Génération en masse par import Excel — Codeflux" },
      {
        name: "description",
        content:
          "Importez un fichier Excel contenant une colonne « Contenu » et générez automatiquement vos Code 128 et QR Codes en PDF, regroupés dans une archive ZIP.",
      },
      { property: "og:title", content: "Génération en masse par import Excel — Codeflux" },
      {
        property: "og:description",
        content:
          "Traitement par lot côté client : détection automatique URL / 9 caractères, suivi en temps réel et export ZIP.",
      },
    ],
  }),
  component: ImportPage,
});

type Status = "pending" | "running" | "success" | "error";

type ResultRow = {
  content: string;
  type: CodeType | null;
  status: Status;
  message?: string;
  url?: string;
  fileName?: string;
};

const TYPE_LABEL: Record<CodeType, string> = { code128: "Code 128", qrcode: "QR Code" };

function ImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [done, setDone] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [zipUrl, setZipUrl] = useState<string | null>(null);

  const stopRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blobsRef = useRef<{ name: string; blob: Blob }[]>([]);

  const reset = () => {
    setResults([]);
    setProcessed(0);
    setDone(false);
    setStopped(false);
    setZipUrl(null);
    blobsRef.current = [];
  };

  const handleFile = useCallback(async (file: File) => {
    reset();
    setImportError(null);
    setRows([]);
    setFileName(file.name);

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setFileName(null);
      setImportError("Format de fichier non supporté : seuls les fichiers .xlsx et .xls sont acceptés.");
      return;
    }

    try {
      const parsed = await parseExcel(file);
      if (parsed.length === 0) {
        setImportError("Aucun contenu exploitable dans la colonne « Contenu ».");
        return;
      }
      setRows(parsed);
    } catch (e) {
      setFileName(null);
      setImportError(e instanceof Error ? e.message : "Impossible de lire le fichier Excel.");
    }
  }, []);

  const buildZip = async () => {
    if (blobsRef.current.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    blobsRef.current.forEach(({ name, blob }) => zip.file(name, blob));
    const archive = await zip.generateAsync({ type: "blob" });
    setZipUrl(URL.createObjectURL(archive));
  };

  const start = async () => {
    reset();
    stopRef.current = false;
    setProcessing(true);
    setResults(rows.map((r) => ({ ...r, status: "pending" as Status })));

    for (let i = 0; i < rows.length; i += 1) {
      if (stopRef.current) break;
      const row = rows[i];
      if (!row) continue;
      setResults((prev) =>
        prev.map((r, index) => (index === i ? { ...r, status: "running" } : r)),
      );
      // Laisse respirer l'interface entre chaque ligne.
      await new Promise((resolve) => setTimeout(resolve, 30));

      if (!row.type) {
        setResults((prev) =>
          prev.map((r, index) =>
            index === i ? { ...r, status: "error", message: FORMAT_ERROR } : r,
          ),
        );
      } else {
        try {
          const blob = await generatePdfBlob(row.content, row.type);
          const name = `${safeFileName(row.content)}.pdf`;
          blobsRef.current.push({ name, blob });
          const url = URL.createObjectURL(blob);
          setResults((prev) =>
            prev.map((r, index) =>
              index === i ? { ...r, status: "success", url, fileName: name } : r,
            ),
          );
        } catch (e) {
          setResults((prev) =>
            prev.map((r, index) =>
              index === i
                ? {
                    ...r,
                    status: "error",
                    message: e instanceof Error ? e.message : "Échec de la génération.",
                  }
                : r,
            ),
          );
        }
      }
      setProcessed(i + 1);
    }

    if (stopRef.current) setStopped(true);
    setProcessing(false);
    setDone(true);
    await buildZip();
  };

  const stop = () => {
    stopRef.current = true;
  };

  const total = rows.length;
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-10 sm:px-8">
      <header className="mb-10 flex flex-col gap-4">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à la génération manuelle
        </Link>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Génération en masse par{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            import Excel
          </span>
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          Importez un fichier .xlsx ou .xls contenant une colonne « Contenu ». Chaque ligne est
          analysée automatiquement : URL → QR Code, 9 caractères → Code 128.
        </p>
      </header>

      <section className="glass mb-6 rounded-2xl p-6 sm:p-8">
        <h2 className="mb-6 text-lg font-semibold">Fichier source</h2>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
            dragging
              ? "border-primary bg-primary/10 glow-neon"
              : "border-white/15 bg-white/[0.02] hover:border-primary/40"
          }`}
        >
          <FileSpreadsheet className="h-10 w-10 text-primary/70" />
          <p className="text-sm text-muted-foreground">
            Glissez-déposez votre fichier Excel ici, ou
          </p>
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="border-white/15 bg-white/5"
          >
            <Upload className="mr-2 h-4 w-4" /> Parcourir
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground/70">Formats acceptés : .xlsx, .xls</p>
          {fileName && (
            <p className="animate-fade-in font-mono text-xs text-primary">{fileName}</p>
          )}
        </div>

        {importError && (
          <p className="mt-4 animate-fade-in rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
            {importError}
          </p>
        )}

        {rows.length > 0 && (
          <div className="mt-6 animate-fade-in space-y-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h3 className="min-w-0 truncate text-sm font-semibold">
                Aperçu des lignes détectées
              </h3>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-muted-foreground">
                {rows.length} ligne{rows.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="max-h-72 overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-background/80 backdrop-blur">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Contenu</th>
                    <th className="px-4 py-3 font-medium">Type détecté</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.content}-${index}`} className="border-t border-white/5">
                      <td className="max-w-xs truncate px-4 py-2.5 font-mono text-xs">
                        {row.content}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.type ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                            {row.type === "qrcode" ? (
                              <QrCode className="h-3.5 w-3.5" />
                            ) : (
                              <Barcode className="h-3.5 w-3.5" />
                            )}
                            {TYPE_LABEL[row.type]}
                          </span>
                        ) : (
                          <span className="text-xs text-destructive/90">Non reconnu</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => void start()}
                disabled={processing || rows.length === 0}
                className="bg-gradient-to-r from-primary to-accent font-semibold text-primary-foreground transition-all duration-300 hover:opacity-95 hover:glow-neon disabled:opacity-40"
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {processing ? "Génération en cours…" : "Générer"}
              </Button>
              {processing && (
                <Button variant="destructive" onClick={stop}>
                  <Square className="mr-2 h-4 w-4" /> Arrêter
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      {results.length > 0 && (
        <section className="glass animate-fade-in rounded-2xl p-6 sm:p-8">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h2 className="min-w-0 truncate text-lg font-semibold">Traitement</h2>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-muted-foreground">
              {processed} / {total} traités · {percent} %
            </span>
          </div>

          <Progress value={percent} className="h-2" />

          {done && (
            <p className="mt-4 text-sm">
              <span className="text-primary">{successCount} succès</span>
              {", "}
              <span className="text-destructive/90">{errorCount} erreurs</span>
              {stopped && (
                <span className="ml-2 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs text-destructive-foreground">
                  Traitement arrêté manuellement
                </span>
              )}
            </p>
          )}

          {zipUrl && (
            <a
              href={zipUrl}
              download={`codeflux-codes-${Date.now()}.zip`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:opacity-95 hover:glow-neon"
            >
              <Download className="mr-2 h-4 w-4" />
              Télécharger l'archive ZIP {stopped ? "partielle" : ""}({blobsRef.current.length} PDF)
            </a>
          )}

          <ul className="mt-6 space-y-2">
            {results.map((r, index) => (
              <li
                key={`${r.content}-${index}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <span className="shrink-0">
                  {r.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                  {r.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                  {r.status === "running" && (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  )}
                  {r.status === "pending" && (
                    <span className="block h-4 w-4 rounded-full border border-white/20" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs">{r.content}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.type ? TYPE_LABEL[r.type] : "—"}
                    {r.message ? ` · ${r.message}` : ""}
                  </span>
                </span>
                {r.url && r.fileName ? (
                  <a
                    href={r.url}
                    download={r.fileName}
                    className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="shrink-0" />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
