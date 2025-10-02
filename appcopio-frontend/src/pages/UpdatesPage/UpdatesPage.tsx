import React, { useEffect, useState, useCallback } from 'react';
import { fetchWithAbort } from '../../services/api';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './UpdatesPage.css';

// --- INTERFACES ADAPTADAS A LA NUEVA API ---
interface UpdateRequest {
	request_id: number;
	description: string;
	status: 'pending' | 'approved' | 'rejected' | 'canceled';
	urgency: string;
	registered_at: string;
	center_name: string;
	requested_by_name: string | null;
	assigned_to_name: string | null;
	resolution_comment?: string | null;
}

interface WorkerUser {
	user_id: number;
	nombre: string;
}

interface UpdatesApiResponse {
	requests: UpdateRequest[];
	total: number;
}

const UpdatesPage: React.FC = () => {
	const apiUrl = import.meta.env.VITE_API_URL;
	const { user } = useAuth();
	const { centerId } = useParams<{ centerId?: string }>();

	// --- ESTADOS ---
	const [requests, setRequests] = useState<UpdateRequest[]>([]);
	const [workers, setWorkers] = useState<WorkerUser[]>([]);
	const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'canceled'>('pending');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const limit = 10;

	// --- ESTADOS PARA EL MODAL DE GESTIÓN ---
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedRequest, setSelectedRequest] = useState<UpdateRequest | null>(null);
	const [assignedWorkerId, setAssignedWorkerId] = useState<string>('');
	const [resolutionComment, setResolutionComment] = useState<string>('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Determinar el rol del usuario para controlar la lógica y la UI
	const isAdmin = user?.role_id === 1 || user?.role_id === 2 || user?.es_apoyo_admin === true;

	// Use a single useEffect for fetching data
	useEffect(() => {
		if (!user) {
			setError("Por favor, inicie sesión.");
			setIsLoading(false);
			return;
		}

		const controller = new AbortController();
		const fetchUpdates = async (signal: AbortSignal) => {
			setIsLoading(true);
			setError(null);

			let url;
			if (centerId) {
			    url = `${apiUrl}/updates/center/${centerId}?status=${filter}&page=${page}&limit=${limit}`;
			} else if (user) {
				url = `${apiUrl}/updates?status=${filter}&page=${page}&limit=${limit}`;
			} else {
				setError("No tiene permisos para ver esta página.");
				setIsLoading(false);
				return;
			}

			try {
				const data = await fetchWithAbort<UpdatesApiResponse>(url, signal);
				setRequests(data.requests || []);
				setTotal(data.total || 0);
			} catch (err) {
				if (err instanceof Error && err.name !== 'AbortError') {
					setError('No se pudieron cargar las solicitudes. Intente más tarde.');
				}
			} finally {
				if (!signal.aborted) {
					setIsLoading(false);
				}
			}
		};

		fetchUpdates(controller.signal);
		return () => controller.abort();
	}, [filter, page, apiUrl, isAdmin, centerId, user]);

	// Fetch workers only if the user is an admin
	useEffect(() => {
		if (!isAdmin) return;

		const controller = new AbortController();
		const fetchWorkers = async () => {
			try {
				const data = await fetchWithAbort<{ users: WorkerUser[] }>(`${apiUrl}/users/active/role/2`, controller.signal);
				setWorkers(data.users || []);
			} catch (err) {
				if (err instanceof Error && err.name !== 'AbortError') {
					console.error("Error al cargar trabajadores:", err);
				}
			}
		};
		fetchWorkers();
		return () => controller.abort();
	}, [apiUrl, isAdmin]);

	// Handlers and modal logic remain the same
	const openManageModal = (request: UpdateRequest) => {
		setSelectedRequest(request);
		setIsModalOpen(true);
	};

	const closeManageModal = () => {
		setIsModalOpen(false);
		setSelectedRequest(null);
		setAssignedWorkerId('');
		setResolutionComment('');
	};

	const handleUpdateRequest = async (action: 'assign' | 'approve' | 'reject') => {
		if (!selectedRequest || !isAdmin) return;
		setIsSubmitting(true);

		const body: any = {};
		if (action === 'assign') {
			if (!assignedWorkerId) {
				alert('Por favor, selecciona un trabajador.');
				setIsSubmitting(false);
				return;
			}
			body.assigned_to = parseInt(assignedWorkerId, 10);
		}
		if (action === 'approve') {
			body.status = 'approved';
			body.resolution_comment = resolutionComment || 'Aprobado';
		}
		if (action === 'reject') {
			if (!resolutionComment) {
				alert('Debes ingresar un motivo de rechazo.');
				setIsSubmitting(false);
				return;
			}
			body.status = 'rejected';
			body.resolution_comment = resolutionComment;
		}

		try {
			await fetch(`${apiUrl}/updates/${selectedRequest.request_id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const controller = new AbortController();
			// Refresh the list by triggering the useEffect
			closeManageModal();
		} catch (err) {
			alert(`Error al procesar la solicitud: ${(err as Error).message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- RENDERIZADO ---
	if (isLoading) return <div className="updates-list-container">Cargando solicitudes...</div>;
	if (error) return <div className="updates-list-container error-message">{error}</div>;

	return (
		<div className="updates-list-container">
			<h2>{isAdmin ? 'Gestión de Solicitudes de Actualización' : 'Mis Solicitudes de Actualización'}</h2>

			<div className="filter-controls">
				<button onClick={() => setFilter('pending')} className={filter === 'pending' ? 'active' : ''}>Pendientes</button>
				<button onClick={() => setFilter('approved')} className={filter === 'approved' ? 'active' : ''}>Aprobadas</button>
				<button onClick={() => setFilter('rejected')} className={filter === 'rejected' ? 'active' : ''}>Rechazadas</button>
				<button onClick={() => setFilter('canceled')} className={filter === 'canceled' ? 'active' : ''}>Canceladas</button>
			</div>

			<table className="updates-table">
				<thead>
					<tr>
						<th>Fecha</th>
						{isAdmin && <th>Centro</th>}
						<th>Solicitado por</th>
						<th>Descripción</th>
						<th>Urgencia</th>
						{isAdmin && <th>Asignado a</th>}
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{requests.length > 0 ? requests.map((req) => (
						<tr key={req.request_id}>
							<td>{new Date(req.registered_at).toLocaleString()}</td>
							{isAdmin && <td>{req.center_name}</td>}
							<td>{req.requested_by_name || 'N/A'}</td>
							<td>{req.description}</td>
							<td><span className={`urgency ${req.urgency.toLowerCase()}`}>{req.urgency}</span></td>
							{isAdmin && <td>{req.assigned_to_name || 'Sin asignar'}</td>}
							<td>
								{isAdmin && req.status === 'pending' && (
									<button onClick={() => openManageModal(req)} className="action-button">Gestionar</button>
								)}
								{(!isAdmin || req.status !== 'pending') && (
									req.resolution_comment || 'N/A'
								)}
							</td>
						</tr>
					)) : (
						<tr><td colSpan={isAdmin ? 7 : 5}>No hay solicitudes con el estado seleccionado.</td></tr>
					)}
				</tbody>
			</table>

			{/* PAGINACIÓN */}
			<div className="pagination-controls">
				<button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button>
				<span>Página {page} de {Math.ceil(total / limit) || 1}</span>
				<button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / limit)}>Siguiente</button>
			</div>

			{/* MODAL DE GESTIÓN (SOLO PARA ADMINS) */}
			{isAdmin && isModalOpen && selectedRequest && (
				<div className="modal-overlay">
					<div className="modal-content">
						<h3>Gestionar Solicitud #{selectedRequest.request_id}</h3>
						<p><strong>Centro:</strong> {selectedRequest.center_name}</p>
						<p><strong>Descripción:</strong> {selectedRequest.description}</p>

						<div className="form-group">
							<label htmlFor="assign-worker">Asignar a Trabajador:</label>
							<select id="assign-worker" value={assignedWorkerId} onChange={e => setAssignedWorkerId(e.target.value)}>
								<option value="">-- Seleccionar --</option>
								{workers.map(w => <option key={w.user_id} value={w.user_id}>{w.nombre}</option>)}
							</select>
							<button onClick={() => handleUpdateRequest('assign')} disabled={isSubmitting || !assignedWorkerId}>Asignar</button>
						</div>

						<hr />

						<div className="form-group">
							<label htmlFor="resolution-comment">Motivo/Comentario de Resolución:</label>
							<textarea id="resolution-comment" value={resolutionComment} onChange={e => setResolutionComment(e.target.value)} rows={3}></textarea>
						</div>

						<div className="modal-actions">
							<button onClick={() => handleUpdateRequest('reject')} className="btn-danger" disabled={isSubmitting}>Rechazar</button>
							<button onClick={() => handleUpdateRequest('approve')} className="btn-primary" disabled={isSubmitting}>Aprobar</button>
							<button onClick={closeManageModal} className="btn-secondary" disabled={isSubmitting}>Cancelar</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default UpdatesPage;
