export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export function toActionError(error: unknown): ActionResult {
  if (error instanceof ActionError) {
    return { ok: false, error: error.message };
  }
  console.error(
    "Unhandled server action error:",
    error instanceof Error ? error.name : "unknown error",
  );
  return { ok: false, error: "Something went wrong. Please try again." };
}
