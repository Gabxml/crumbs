import { AlignLeft } from '@untitledui/icons/AlignLeft'
import { Calendar } from '@untitledui/icons/Calendar'
import { Image01 } from '@untitledui/icons/Image01'
import { Link01 } from '@untitledui/icons/Link01'
import { WIDGET_TYPES } from '../lib/collectionSchemas'
import type { WidgetType } from '../lib/collectionSchemas'
import Modal from './Modal'

// One glyph each, so the choice is made by recognising the shape rather than by
// reading four similar words.
const CHOICES: Record<WidgetType, { label: string; hint: string; Icon: typeof AlignLeft }> = {
  notes: { label: 'Notes', hint: 'Write something, or a checklist', Icon: AlignLeft },
  date: { label: 'Date', hint: 'A day that matters', Icon: Calendar },
  image: { label: 'Picture', hint: 'Upload a photo', Icon: Image01 },
  link: { label: 'Link', hint: 'Paste a URL and keep its preview', Icon: Link01 },
}

/**
 * Which kind of thing to put in a row.
 *
 * A popover rather than four buttons left sitting under the row, because the
 * dashed card at the end of the strip is the affordance and the four kinds are
 * only a second question once it has been taken up.
 */
export default function WidgetChooser({
  open,
  busy,
  onChoose,
  onClose,
}: {
  open: boolean
  /** Which type is mid-flight, so its button can say so. */
  busy: WidgetType | null
  onChoose: (type: WidgetType) => void
  onClose: () => void
}) {
  return (
    <Modal open={open} centered title="Add to this row" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {WIDGET_TYPES.map((type) => {
          const { label, hint, Icon } = CHOICES[type]
          return (
            <button
              key={type}
              type="button"
              disabled={busy !== null}
              onClick={() => onChoose(type)}
              className="flex flex-col items-start gap-1.5 rounded-media bg-fill p-4 text-left transition duration-200 ease-ios hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.97] disabled:opacity-40"
            >
              <Icon size={20} strokeWidth={1.75} className="text-text" />
              <span className="text-[16px] font-semibold tracking-heading text-text-h">
                {busy === type ? 'Adding…' : label}
              </span>
              <span className="text-[13px] text-text">{hint}</span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}