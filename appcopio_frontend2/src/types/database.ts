export type UUID = string;


export type Dataset = {
dataset_id: UUID | number;
name: string;
activation_id: number;
center_id?: number | null;
template_id?: number | null;
created_at?: string;
};


export type DatasetTemplate = {
template_id: number;
name: string;
description?: string | null;
};


export type DatasetCreatePayload = {
name: string;
activation_id: number;
center_id?: number | null;
template_id?: number | null; // null => base vacía
};