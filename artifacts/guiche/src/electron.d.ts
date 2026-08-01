export {};

declare global {
  interface Window {
    guicheDesktop?: {
      setReminder(data: { deskId: number; deskName: string; occupiedAt: string; reminderMinutes: number } | null): void;
      onReminderAction(callback: (action: "free" | "snooze") => void): () => void;
    };
  }
}
