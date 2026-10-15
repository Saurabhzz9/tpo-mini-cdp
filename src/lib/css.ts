/** Retain readable DOM/test classes while adding feature-local CSS Module names. */
export function css(styles: Readonly<Record<string, string>>, names: string) {
  return names
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((name) => (styles[name] ? [name, styles[name]] : [name]))
    .join(" ");
}
