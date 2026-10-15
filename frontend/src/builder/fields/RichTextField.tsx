import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { useBuilder } from "../store";
import { IconButton, Icons } from "../ui";

interface Props {
  label: string;
  value: string;
  onChange: (html: string) => void;
}

// TipTap writes "<p></p>" for an empty editor; store "" like Reactive Resume does.
const normalize = (html: string) => (html === "<p></p>" ? "" : html);

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-URL (leer = entfernen)", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex gap-0.5 border-b border-slate-200 px-1 py-0.5">
      <IconButton title="Fett" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Icons.Bold />
      </IconButton>
      <IconButton title="Kursiv" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Icons.Italic />
      </IconButton>
      <IconButton title="Unterstrichen" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Icons.Underline />
      </IconButton>
      <IconButton title="Aufzählung" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <Icons.List />
      </IconButton>
      <IconButton title="Nummerierte Liste" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <Icons.ListOrdered />
      </IconButton>
      <IconButton title="Link" active={editor.isActive("link")} onClick={setLink}>
        <Icons.Link />
      </IconButton>
    </div>
  );
}

export default function RichTextField({ label, value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, blockquote: false, horizontalRule: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    editorProps: { attributes: { class: "rich-text min-h-20 px-2.5 py-1.5 text-sm outline-none" } },
    onUpdate: ({ editor }) => onChange(normalize(editor.getHTML())),
  });

  // A disabled fieldset doesn't reach contenteditable, so a locked resume switches the editor off itself.
  const locked = useBuilder((s) => s.locked);
  useEffect(() => {
    editor?.setEditable(!locked);
  }, [editor, locked]);

  // External changes (undo/redo) replace the content; typing doesn't, so the cursor stays put.
  useEffect(() => {
    if (editor && normalize(editor.getHTML()) !== value) editor.commands.setContent(value, false);
  }, [editor, value]);

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <div className="rounded-md border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        {editor && <Toolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
