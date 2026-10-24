/** True when typing into a field: global shortcuts must stay out of the way. */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

const NATIVE_KEY_OWNERS: Record<string, string> = {
  " ": "button, a, summary, [role=button], [role=slider], [role=radio], [role=tab], [role=switch], [role=checkbox], [role=option], [role=menuitem]",
  ArrowLeft: "[role=slider], [role=radio], [role=tab], [role=option], [role=menuitem]",
  ArrowRight: "[role=slider], [role=radio], [role=tab], [role=option], [role=menuitem]",
  Home: "[role=slider], [role=radio], [role=tab], [role=option]",
  End: "[role=slider], [role=radio], [role=tab], [role=option]",
};

/** True when the focused control already does something with `key` (e.g. Space on a button). */
export function keyOwnedByFocus(target: EventTarget | null, key: string): boolean {
  const selector = NATIVE_KEY_OWNERS[key];
  return Boolean(selector && target instanceof Element && target.closest(selector));
}
