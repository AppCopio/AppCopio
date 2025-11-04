import { DatasetTemplateKey } from "./database";

// Definición de un item de plantilla completo para el FE
export type TemplateItem = {
  key: DatasetTemplateKey;
  name: string;
  description: string;
  previewColumns?: string[];
  fields: any[]; 
};

// Lista de plantillas visibles en el UI (Matriz exportada para .map y .find)
export const TEMPLATES: TemplateItem[] = [
    {
        key: "blank",
        name: "Base de datos en blanco",
        description: "Comienza sin columnas predefinidas. Podrás agregarlas luego.",
        fields: [], // Sin campos predefinidos
    }, 
    {
        key: "personas_albergadas",
        name: "Personas Albergadas",
        description: "Registro de interacciones con las habitaciones del albergue.",
        previewColumns: ["Nombre", "Rut", "Día 1", "Día 2"],
        fields: [
            { name: "Nombre", key: "nombre", field_type: "text", position: 10, is_required: true, settings: {} },
            { name: "RUT", key: "rut", field_type: "text", position: 20, is_required: true, settings: {} },
            { name: "Día 1 (Presente)", key: "dia_1", field_type: "bool", position: 30, is_required: false, settings: {} },
            { name: "Día 2 (Presente)", key: "dia_2", field_type: "bool", position: 40, is_required: false, settings: {} },
        ],
    },
    {
        key: "reubicaciones",
        name: "Reubicaciones",
        description: "Movimiento de personas de albergues/centros, con motivo y destino.",
        previewColumns: ["Nombre", "Rut", "Reubicación", "Situación", "Caracterización", "Condiciones de salud"],
        fields: [
            { name: "Nombre", key: "nombre", field_type: "text", position: 10, is_required: true, settings: {} },
            { name: "RUT", key: "rut", field_type: "text", position: 20, is_required: true, settings: {} },
            { name: "Reubicación", key: "reubicacion", field_type: "text", position: 30, is_required: false, settings: {} },
            { name: "Situación", key: "situacion", field_type: "text", position: 40, is_required: false, settings: {} },
            { name: "Caracterización", key: "caracterizacion", field_type: "text", position: 50, is_required: false, settings: {} },
            { name: "Condiciones de Salud", key: "condiciones_salud", field_type: "text", position: 60, is_required: false, settings: {} },
        ],
    },
    {
        key: "red_apoyo",
        name: "Redes de apoyo",
        description: "Registra las redes de apoyo de las personas ingresadas.",
        previewColumns: ["Número de folio", "Nombre", "Edad", "Rut", "Observaciones", "Contactos"],
        fields: [
            { name: "Número de folio", key: "numero_folio", field_type: "text", position: 10, is_required: true, settings: {} },
            { name: "Nombre", key: "nombre", field_type: "text", position: 20, is_required: true, settings: {} },
            { name: "Edad", key: "edad", field_type: "number", position: 30, is_required: false, settings: {} },
            { name: "Rut", key: "rut", field_type: "text", position: 40, is_required: true, settings: {} },
            { name: "Observaciones", key: "observaciones", field_type: "text", position: 50, is_required: false, settings: {} },
            { name: "Contactos", key: "contactos", field_type: "text", position: 60, is_required: false, settings: {} }, 
        ],
    },
    {
        key: "familias_integradas",
        name: "Familias Integradas",
        description: "Registra el estado de las familias y su situación dentro del centro.",
        previewColumns: ["Fecha", "Persona", "Presente", "Observaciones"],
        fields: [
            { name: "Fecha", key: "fecha", field_type: "date", position: 10, is_required: true, settings: {} },
            { name: "Persona", key: "persona", field_type: "text", position: 20, is_required: true, settings: {} },
            { name: "Presente", key: "presente", field_type: "bool", position: 30, is_required: false, settings: {} },
            { name: "Observaciones", key: "observaciones", field_type: "text", position: 40, is_required: false, settings: {} },
        ],
    },
    {
        key: "personas_ingresadas",
        name: "Personas Ingresadas",
        description: "Control de ingreso y egreso de personas al centro.",
        previewColumns: ["Fecha", "Persona", "Presente", "Observaciones"],
        fields: [
            { name: "Fecha", key: "fecha", field_type: "date", position: 10, is_required: true, settings: {} },
            { name: "Persona", key: "persona", field_type: "text", position: 20, is_required: true, settings: {} },
            { name: "Presente", key: "presente", field_type: "bool", position: 30, is_required: false, settings: {} },
            { name: "Observaciones", key: "observaciones", field_type: "text", position: 40, is_required: false, settings: {} },
        ],
    },
    {
        key: "ayudas_entregadas",
        name: "Apoyos Entregados",
        description: "¿Qué recurso se entregó, a quién, cuándo y en qué cantidad?",
        previewColumns: ["Nombre", "Primer Apellido", "Segundo Apellido", "Rut/Pasaporte", "Número de Folio", "Colchones", "Frazadas", "Alimento", "Gas"],
        fields: [
            { name: "Nombre", key: "nombre", field_type: "text", position: 10, is_required: true, settings: {} },
            { name: "Primer Apellido", key: "primer_apellido", field_type: "text", position: 20, is_required: true, settings: {} },
            { name: "Segundo Apellido", key: "segundo_apellido", field_type: "text", position: 30, is_required: false, settings: {} },
            { name: "Rut/Pasaporte", key: "rut_pasaporte", field_type: "text", position: 40, is_required: true, settings: {} },
            { name: "Número de Folio", key: "numero_folio", field_type: "text", position: 50, is_required: false, settings: {} },
            { name: "Colchones", key: "colchones", field_type: "number", position: 60, is_required: false, settings: {} },
            { name: "Frazadas", key: "frazadas", field_type: "number", position: 70, is_required: false, settings: {} },
            { name: "Alimento", key: "alimento", field_type: "number", position: 80, is_required: false, settings: {} },
            { name: "Gas", key: "gas", field_type: "number", position: 90, is_required: false, settings: {} },
        ],
    },
    {
        key: "registro_p_persona",
        name: "Registro diario por persona",
        description: "Registro detallado de interacciones o eventos por persona.",
        previewColumns: ["Fecha", "Persona", "Detalle", "Acción"],
        fields: [
            { name: "Fecha", key: "fecha", field_type: "datetime", position: 10, is_required: true, settings: {} }, 
            { name: "Persona", key: "persona", field_type: "text", position: 20, is_required: true, settings: {} },
            { name: "Detalle", key: "detalle", field_type: "text", position: 30, is_required: false, settings: {} },
            { name: "Acción", key: "accion", field_type: "text", position: 40, is_required: false, settings: {} }, 
        ],
    },

    {
        key: "solicitudes_servicios",
        name: "Solicitudes de Servicios",
        description: "Gestión de solicitudes de servicios voluntarios para el centro.",
        previewColumns: ["Título", "Categoría", "Prioridad", "Estado"],
        fields: [
            { 
                name: "Título", 
                key: "titulo", 
                field_type: "text", 
                position: 10, 
                is_required: true, 
                settings: { maxLength: 100 } 
            },
            { 
                name: "Descripción", 
                key: "descripcion", 
                field_type: "text", 
                position: 20, 
                is_required: true, 
                settings: { maxLength: 500, multiline: true } 
            },
            { 
                name: "Categoría", 
                key: "categoria", 
                field_type: "select", 
                position: 30, 
                is_required: true,
                settings: {
                    options: [
                        { value: "salud", label: "Salud", icon: "🏥" },
                        { value: "psicologia", label: "Psicología", icon: "🧠" },
                        { value: "alimentacion", label: "Alimentación", icon: "🍽️" },
                        { value: "limpieza", label: "Limpieza", icon: "🧹" },
                        { value: "transporte", label: "Transporte", icon: "🚐" },
                        { value: "educacion", label: "Educación", icon: "📚" },
                        { value: "legal", label: "Legal", icon: "⚖️" },
                        { value: "mantenimiento", label: "Mantenimiento", icon: "🔧" },
                        { value: "otro", label: "Otro", icon: "📋" },
                    ]
                }
            },
            { 
                name: "Prioridad", 
                key: "prioridad", 
                field_type: "select", 
                position: 40, 
                is_required: true,
                settings: {
                    options: [
                        { value: "alta", label: "Alta", color: "#d32f2f" },
                        { value: "media", label: "Media", color: "#ed6c02" },
                        { value: "baja", label: "Baja", color: "#2e7d32" },
                    ]
                }
            },
            { 
                name: "Estado", 
                key: "estado", 
                field_type: "select", 
                position: 50, 
                is_required: true,
                settings: {
                    options: [
                        { value: "pendiente", label: "Pendiente" },
                        { value: "en_progreso", label: "En Progreso" },
                        { value: "completada", label: "Completada" },
                        { value: "cancelada", label: "Cancelada" },
                    ]
                }
            },
            { 
                name: "Notas", 
                key: "notas", 
                field_type: "text", 
                position: 60, 
                is_required: false, 
                settings: { multiline: true } 
            },
        ],
    },
] as const;
