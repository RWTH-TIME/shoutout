"use client";

type SettingsSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-divider bg-surface p-6 text-on-surface">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-description">{description}</p>
      </div>
      {children}
    </section>
  );
}
