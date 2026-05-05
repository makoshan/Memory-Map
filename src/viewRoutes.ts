export type ViewKey = "world" | "office" | "memory";

export function getPathForView(view: ViewKey) {
  if (view === "office") {
    return "/office";
  }

  if (view === "memory") {
    return "/memory";
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

  return "world";
}
