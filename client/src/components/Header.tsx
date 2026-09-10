import { useLanguage } from "../utils/i18n";

type HeaderProps = { title: string; action?: React.ReactNode };

export function Header({ title, action }: HeaderProps) {
  const { t, language } = useLanguage();
  return (
    <div className="top">
      <div>
        <h1 className="title">{t(title)}</h1>
        <div className="muted">
          {new Date().toLocaleDateString(language === "uz" ? "uz-UZ" : "ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </div>
      {action}
    </div>
  );
}
