import { useEffect, useMemo, useState } from "react";
import type { User } from "../../types/user";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  setActive,
  setPassword,
} from "../../services/usersApi";

const pageSizeDefault = 10;

export default function UsersManagementPage() {
  // filtros
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState<number | undefined>();
  const [centerId, setCenterId] = useState<string | undefined>();
  const [active, setActiveFilter] = useState<0 | 1 | undefined>();

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);

  // data
  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modales simples controlados por estado
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [pwUser, setPwUser] = useState<User | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { users, total } = await listUsers({
        search: search || undefined,
        role_id: roleId,
        center_id: centerId,
        active,
        page,
        pageSize,
      });
      setRows(users as User[]);
      setTotal(total);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleId, centerId, active, page, pageSize]);

  function resetFilters() {
    setSearch("");
    setRoleId(undefined);
    setCenterId(undefined);
    setActiveFilter(undefined);
    setPage(1);
  }

  // helpers UI
  function LabeledInput({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
  }: {
    label: string;
    value: any;
    onChange: (v: any) => void;
    type?: string;
    placeholder?: string;
  }) {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
        <input
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
        />
      </label>
    );
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <h1>Usuarios – Test CRUD</h1>

      {/* Filtros */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 12,
          alignItems: "end",
        }}
      >
        <LabeledInput label="Buscar" value={search} onChange={setSearch} />
        <LabeledInput
          label="Role ID"
          value={roleId ?? ""}
          onChange={(v) => setRoleId(v ? Number(v) : undefined)}
          placeholder="ej. 1"
        />
        <LabeledInput
          label="Center ID"
          value={centerId ?? ""}
          onChange={setCenterId}
          placeholder="ej. CEN-01"
        />
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#555" }}>Activo</span>
          <select
            value={active ?? ""}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              setActiveFilter(v === "" ? undefined : (Number(v) as 0 | 1));
            }}
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
          >
            <option value="">Todos</option>
            <option value="1">Sí</option>
            <option value="0">No</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#555" }}>Page size</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number((e.target as HTMLSelectElement).value))}
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button onClick={resetFilters} style={{ height: 38 }}>Limpiar</button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setCreating(true)}>+ Nuevo usuario</button>
        <button onClick={load} disabled={loading}>
          {loading ? "Cargando..." : "Refrescar"}
        </button>
        {error && <span style={{ color: "crimson" }}>{error}</span>}
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              {[
                "ID",
                "RUT",
                "Username",
                "Email",
                "Role",
                "Center",
                "Activo",
                "Creado",
                "Acciones",
              ].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.user_id}>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{u.user_id}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{u.rut}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{u.username}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{u.email}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{u.role_name ?? u.role_id}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{u.center_id ?? "—"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{u.is_active ? "Sí" : "No"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{new Date(u.created_at).toLocaleString()}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" }}>
                  <button onClick={() => setEditing(u)}>Editar</button>{" "}
                  <button onClick={() => handleToggleActive(u)}>
                    {u.is_active ? "Desactivar" : "Activar"}
                  </button>{" "}
                  <button onClick={() => setPwUser(u)}>Password</button>{" "}
                  <button onClick={() => handleDelete(u)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={9} style={{ padding: 16, textAlign: "center", color: "#888" }}>
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          ◀ Prev
        </button>
        <span>
          Página {page} / {totalPages} (total {total})
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          Next ▶
        </button>
      </div>

      {/* Modal Crear */}
      {creating && (
        <Modal onClose={() => setCreating(false)} title="Nuevo usuario">
          <CreateForm
            onCancel={() => setCreating(false)}
            onOk={async (payload) => {
              await createUser(payload);
              setCreating(false);
              await load();
            }}
          />
        </Modal>
      )}

      {/* Modal Editar */}
      {editing && (
        <Modal onClose={() => setEditing(null)} title={`Editar #${editing.user_id}`}>
          <EditForm
            user={editing}
            onCancel={() => setEditing(null)}
            onOk={async (changes) => {
              await updateUser(editing.user_id, changes);
              setEditing(null);
              await load();
            }}
          />
        </Modal>
      )}

      {/* Modal Password */}
      {pwUser && (
        <Modal onClose={() => setPwUser(null)} title={`Cambiar password #${pwUser.user_id}`}>
          <PasswordForm
            onCancel={() => setPwUser(null)}
            onOk={async (pw) => {
              await setPassword(pwUser.user_id, pw);
              setPwUser(null);
            }}
          />
        </Modal>
      )}
    </div>
  );

  async function handleToggleActive(u: User) {
    try {
      await setActive(u.user_id, !u.is_active);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error al actualizar estado");
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`¿Eliminar usuario #${u.user_id}?`)) return;
    try {
      await deleteUser(u.user_id);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Error al eliminar");
    }
  }
}

// ---- UI auxiliares ----
function Modal({ title, children, onClose }: { title: string; children: any; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0006",
        display: "grid",
        placeItems: "center",
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", minWidth: 420, maxWidth: 720, padding: 16, borderRadius: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>{title}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

function CreateForm({
  onOk,
  onCancel,
}: {
  onOk: (payload: {
    rut: string;
    username: string;
    password: string;
    email: string;
    role_id: number;
    center_id?: string | null;
    nombre?: string | null;
    genero?: string | null;
    celular?: string | null;
    imagen_perfil?: string | null;
  }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [rut, setRut] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(1);
  const [centerId, setCenterId] = useState<string | "" | null>("");

  const valid = rut && username && email && password.length >= 8 && roleId;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        await onOk({ rut, username, password, email, role_id: roleId, center_id: centerId || null });
      }}
      style={{ display: "grid", gap: 10 }}
    >
      <Field label="RUT"><input value={rut} onChange={(e) => setRut(e.target.value)} /></Field>
      <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
      <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Field label="Role ID"><input type="number" value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} /></Field>
      <Field label="Center ID (opcional)"><input value={centerId ?? ""} onChange={(e) => setCenterId(e.target.value)} /></Field>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="submit" disabled={!valid}>Crear</button>
      </div>
    </form>
  );
}

function EditForm({
  user,
  onOk,
  onCancel,
}: {
  user: User;
  onOk: (changes: Partial<User>) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [roleId, setRoleId] = useState<number>(user.role_id);
  const [centerId, setCenterId] = useState<string | "" | null>(user.center_id ?? "");
  const [isActive, setIsActive] = useState<boolean>(user.is_active);

  const changes = useMemo(() => ({
    email,
    username,
    role_id: roleId,
    center_id: centerId === "" ? null : centerId,
    is_active: isActive,
  }), [email, username, roleId, centerId, isActive]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onOk(changes);
      }}
      style={{ display: "grid", gap: 10 }}
    >
      <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
      <Field label="Role ID"><input type="number" value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} /></Field>
      <Field label="Center ID"><input value={centerId ?? ""} onChange={(e) => setCenterId(e.target.value)} /></Field>
      <Field label="Activo"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /></Field>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="submit">Guardar</button>
      </div>
    </form>
  );
}

function PasswordForm({ onOk, onCancel }: { onOk: (password: string) => void | Promise<void>; onCancel: () => void }) {
  const [pw, setPw] = useState("");
  const valid = pw.length >= 8;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        await onOk(pw);
      }}
      style={{ display: "grid", gap: 10 }}
    >
      <Field label="Nuevo password (min 8)"><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="submit" disabled={!valid}>Guardar</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
      {children}
    </label>
  );
}