type ModalProps = {
  title: string;
  close: () => void;
  children: React.ReactNode;
};

export function Modal({ title, close, children }: ModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#10221955",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onClick={close}
    >
      <div
        className="card"
        style={{ width: "min(600px,100%)", display: "grid", gap: 18 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="top" style={{ margin: 0 }}>
          <h2 className="display">{title}</h2>
          <button className="button secondary" onClick={close}>
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
