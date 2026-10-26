// The universal profile form is filled from the saved profile, but the saved
// profile is refreshed in the background (token refreshes, coming back to the
// tab, picking a file). A refresh must not wipe what the person is typing.

export type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  role: string;
  authorization: string;
  privacy: boolean;
  automatic: boolean;
};

const keys: Array<keyof ProfileFormValues> = [
  "firstName", "lastName", "email", "phone", "city", "country", "role", "authorization", "privacy", "automatic",
];

const differs = (a: ProfileFormValues, b: ProfileFormValues) => keys.some((key) => a[key] !== b[key]);

/**
 * Decides whether to overwrite the form with `saved`.
 * - First load, or the person has not touched anything: apply the saved values.
 * - The person has typed something that is not saved yet: keep it.
 * - What they typed was just saved (saved now equals the form): apply and move on.
 */
export function nextProfileForm(
  saved: ProfileFormValues,
  current: ProfileFormValues,
  baseline: ProfileFormValues | null,
): { apply: boolean; baseline: ProfileFormValues } {
  if (!baseline) return { apply: true, baseline: saved };
  const edited = differs(current, baseline);
  if (edited && differs(saved, current)) return { apply: false, baseline };
  return { apply: true, baseline: saved };
}
