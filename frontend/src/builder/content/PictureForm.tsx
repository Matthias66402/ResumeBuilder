import { useRef, useState } from "react";
import { api } from "../../api";
import { hexToRgba, rgbaToHex } from "../../lib/color";
import { downscaleImage } from "../../lib/image";
import type { Picture } from "../../types/resume";
import { useBuilder } from "../store";
import { IconButton, Icons, inputClass, Label, Slider } from "../ui";

const ASPECT_RATIOS = [
  { value: 1, label: "Quadratisch (1:1)" },
  { value: 0.75, label: "Hochformat (3:4)" },
  { value: 0.8, label: "Passbild (4:5)" },
  { value: 1.5, label: "Querformat (3:2)" },
];

/** Profile picture (Reactive Resume's `picture`): upload plus the frame settings templates use. */
export default function PictureForm() {
  const resumeId = useBuilder((s) => s.id!);
  const picture = useBuilder((s) => s.data!.picture);
  const update = useBuilder((s) => s.update);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Picture>(key: K, value: Picture[K], coalesce = false) =>
    update((d) => void (d.picture[key] = value), coalesce ? `picture:${key}` : undefined);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.uploadPicture(resumeId, await downscaleImage(file));
      // One undo step: the new picture shows even if it was hidden before.
      update((d) => {
        d.picture.url = url;
        d.picture.hidden = false;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const hasPicture = !!picture.url.trim();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          title={hasPicture ? "Bild ersetzen" : "Bild hochladen"}
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-400 disabled:cursor-wait"
        >
          {busy ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          ) : hasPicture ? (
            <img src={picture.url} alt="Profilbild" className={`h-full w-full object-cover ${picture.hidden ? "opacity-40" : ""}`} />
          ) : (
            <Icons.Plus />
          )}
        </button>
        <div className="min-w-0 flex-1 text-sm">
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="font-medium text-blue-700 hover:underline">
            {hasPicture ? "Bild ersetzen" : "Profilbild hochladen"}
          </button>
          <p className="text-xs text-slate-500">JPEG, PNG oder WebP, bis 5 MB</p>
        </div>
        {hasPicture && (
          <>
            <IconButton title={picture.hidden ? "Bild einblenden" : "Bild ausblenden"} onClick={() => set("hidden", !picture.hidden)}>
              {picture.hidden ? <Icons.EyeOff /> : <Icons.Eye />}
            </IconButton>
            <IconButton title="Bild entfernen" onClick={() => set("url", "")} className="hover:text-red-600">
              <Icons.Trash />
            </IconButton>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>}

      {hasPicture && !picture.hidden && (
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
          <Slider label="Größe" unit=" pt" min={32} max={200} value={picture.size} onChange={(v) => set("size", v, true)} />
          <Slider label="Eckenradius" unit=" pt" min={0} max={100} value={picture.borderRadius} onChange={(v) => set("borderRadius", v, true)} />
          <Label label="Seitenverhältnis">
            <select value={picture.aspectRatio} onChange={(e) => set("aspectRatio", Number(e.target.value))} className={inputClass}>
              {!ASPECT_RATIOS.some((r) => r.value === picture.aspectRatio) && <option value={picture.aspectRatio}>{picture.aspectRatio}</option>}
              {ASPECT_RATIOS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Label>
          <Label label="Einpassen">
            <select value={picture.fit} onChange={(e) => set("fit", e.target.value as Picture["fit"])} className={inputClass}>
              <option value="cover">Ausfüllen</option>
              <option value="contain">Ganz zeigen</option>
            </select>
          </Label>
          <Slider label="Rahmen" unit=" pt" min={0} max={8} step={0.5} value={picture.borderWidth} onChange={(v) => set("borderWidth", v, true)} />
          <label className="flex items-end justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Rahmenfarbe</span>
            <input
              type="color"
              value={rgbaToHex(picture.borderColor)}
              onChange={(e) => set("borderColor", hexToRgba(e.target.value), true)}
              className="h-7 w-12 cursor-pointer rounded border border-slate-300"
            />
          </label>
          <Slider label="Schatten" unit=" pt" min={0} max={12} value={picture.shadowWidth} onChange={(v) => set("shadowWidth", v, true)} />
          <Slider label="Drehung" unit="°" min={0} max={360} value={picture.rotation} onChange={(v) => set("rotation", v, true)} />
        </div>
      )}
    </div>
  );
}
