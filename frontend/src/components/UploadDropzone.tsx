import { useRef, useState } from "react";

interface Props {
  busy: boolean;
  onFile: (file: File) => void;
}

export default function UploadDropzone({ busy, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !busy) onFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !busy && input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
        busy
          ? "cursor-wait border-slate-300 bg-slate-100"
          : dragging
            ? "cursor-copy border-blue-500 bg-blue-50"
            : "cursor-pointer border-slate-300 bg-white hover:border-blue-400"
      }`}
    >
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
      {busy ? (
        <>
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="font-medium">Lebenslauf wird analysiert …</p>
          <p className="text-sm text-slate-500">Das kann einige Sekunden dauern.</p>
        </>
      ) : (
        <>
          <p className="font-medium">PDF-Lebenslauf hierher ziehen oder klicken</p>
          <p className="text-sm text-slate-500">Text-PDFs bis 10 MB</p>
        </>
      )}
    </div>
  );
}
