import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, type ReactNode } from 'react'
import { BulletListIcon, OrderedListIcon, QuoteIcon } from './icons'

const HEADING_OPTIONS = [
  { value: '0', label: 'Choose heading' },
  { value: '2', label: 'Heading' },
  { value: '3', label: 'Subheading' },
]

const EDITOR_CONTENT_CLASS =
  'min-h-[160px] px-3 py-2 text-sm text-[#111827] focus:outline-none ' +
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-[#e5e7eb] [&_blockquote]:pl-3 ' +
  '[&_blockquote]:italic [&_blockquote]:text-[#6b7280] [&_p]:mb-2 ' +
  '[&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-bold'

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md p-1.5 text-sm ${
        active ? 'bg-[#eef2ff] text-[#4f46e5]' : 'text-[#4b5563] hover:bg-[#f3f4f6]'
      }`}
    >
      {children}
    </button>
  )
}

function headingValue(editor: Editor) {
  if (editor.isActive('heading', { level: 2 })) return '2'
  if (editor.isActive('heading', { level: 3 })) return '3'
  return '0'
}

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
}

function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: EDITOR_CONTENT_CLASS } },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  function applyHeading(level: string) {
    if (level === '0') {
      editor?.chain().focus().setParagraph().run()
    } else {
      editor
        ?.chain()
        .focus()
        .toggleHeading({ level: Number(level) as 2 | 3 })
        .run()
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white focus-within:ring-2 focus-within:ring-[#4f46e5]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#e5e7eb] bg-[#f9fafb] px-2 py-1.5">
        <select
          value={headingValue(editor)}
          onChange={(e) => applyHeading(e.target.value)}
          className="rounded-md border border-[#e5e7eb] bg-white px-2 py-1 text-xs text-[#111827] outline-none"
        >
          {HEADING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="mx-1 h-5 w-px bg-[#e5e7eb]" />
        <ToolbarButton
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <BulletListIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <OrderedListIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Quote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <QuoteIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

export default RichTextEditor
