## 2024-05-23 - Custom Modal Accessibility Pattern
**Learning:** Custom modal implementations (using `fixed inset-0` with state-based rendering) consistently lack standard ARIA attributes (`role="dialog"`, `aria-modal="true"`) and keyboard event listeners (Escape key to close) across the codebase (e.g., NotificationCenter, QuickTaskModal).
**Action:** When touching any modal component, automatically check for and add:
1. `role="dialog"` and `aria-modal="true"` on the container.
2. `useEffect` listener for the `Escape` key.
3. `aria-labelledby` pointing to the modal title.
4. Focus management (though often harder to implement without a library).
