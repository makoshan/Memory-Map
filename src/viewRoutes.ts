export type ViewKey = "world" | "office" | "memory" | "memoryImport";

export function getPathForView(view: ViewKey) {
  if (view === "office") {
    return "/office";
  }

  if (view === "memory") {
    return "/memory";
  }

  if (view === "memoryImport") {
    return "/memory/import";
  }

  return "/";
}

export function getViewFromPathname(pathname: string): ViewKey {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (normalized === "/office") {
    return "office";
  }

  if (normalized === "/memory") {
    return "memory";
  }

  if (normalized === "/memory/import") {
    return "memoryImport";
  }

  return "world";
}
