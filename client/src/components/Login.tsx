import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { post } from "../api/client";
import { useLanguage } from "../utils/i18n";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const { t, language, setLanguage } = useLanguage();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await post("/auth/login", { email, password });
      localStorage.setItem("token", response.accessToken);
      localStorage.setItem("user", JSON.stringify(response.user));
      navigate("/");
    } catch (cause: any) {
      setError(cause.message);
    }
  };

  return (
    <div className="login">
      <form className="card loginbox" onSubmit={submit}>
        <div className="brand" style={{ background: "#173b2b", margin: "-20px -20px 22px", padding: "22px" }}>SHOP / CRM</div>
        <div className="login-language"><button className={language === "ru" ? "active" : ""} type="button" onClick={() => setLanguage("ru")}>RU</button><button className={language === "uz" ? "active" : ""} type="button" onClick={() => setLanguage("uz")}>UZ</button></div>
        <h1 className="title">{t("Вход в систему")}</h1>
        <p className="muted">{t("Управляйте магазином спокойно и точно.")}</p>
        <label>Email<input className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>{t("Пароль")}<input className="input" type="password" autoComplete="current-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button className="button" style={{ width: "100%", marginTop: 8 }}>{t("Войти")}</button>
      </form>
    </div>
  );
}
