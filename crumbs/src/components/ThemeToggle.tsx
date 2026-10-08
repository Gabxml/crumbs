import { Moon01 } from '@untitledui/icons/Moon01'
import { Sun } from '@untitledui/icons/Sun'
import { useTheme } from '../hooks/useTheme'
import { IconButton } from './Button'

/**
 * Switches between the two palettes. Until the user makes a choice this follows
 * the system, which is why the icon reflects the theme currently on screen
 * rather than the one the button would move to.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const label = theme === 'dark' ? 'Switch to light' : 'Switch to dark'

  return (
    <IconButton label={label} onClick={toggle} className={className}>
      {theme === 'dark' ? (
        <Moon01 size={20} strokeWidth={1.75} />
      ) : (
        <Sun size={20} strokeWidth={1.75} />
      )}
    </IconButton>
  )
}
