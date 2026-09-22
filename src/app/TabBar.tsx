/** Bottom tab bar: Map, Curlo, Practice, Vault, Bestiary (direction-aware slides). */
import { Icon } from '@/ui/Icon';
import { navigate } from './navigation';
import { TABS, tabIndex, type RouteHandle } from './routeMeta';
import styles from './shell.module.css';

export function TabBar({ handle }: { handle: RouteHandle }) {
  const cur = tabIndex(handle.tab);
  return (
    <nav className={styles.tabs} aria-label="Main">
      {TABS.map((t, i) => {
        const active = handle.tab === t.id && !handle.panel;
        return (
          <button
            key={t.id}
            type="button"
            className={styles.tab}
            aria-current={active ? 'page' : undefined}
            data-origin-id={`tab-${t.id}`}
            onClick={() => {
              if (active) return;
              // from a header panel: fade; between tabs: slide by order
              const dir = handle.panel || cur < 0 ? 'fade' : i < cur ? -1 : 1;
              navigate(t.path, { dir, replace: true });
            }}
          >
            <span className={styles.ti}>
              <Icon name={t.icon} />
            </span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
