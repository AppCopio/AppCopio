import { Db } from "../types/db";

// Suponiendo que tienes un tipo para Category, si no, puedes crearlo.
export interface Category {
    category_id: number;
    name: string;
}

/**
 * Obtiene todas las categorías de la base de datos, ordenadas por nombre.
 * @param db Pool de conexión a la base de datos.
 * @returns Un array de objetos Category.
 */
export async function getAllCategories(db: Db): Promise<Category[]> {
    const result = await db.query('SELECT * FROM Categories ORDER BY name ASC');
    return result.rows;
}

/**
 * Añade una nueva categoría a la base de datos.
 * @param db Pool de conexión a la base de datos.
 * @param name El nombre de la nueva categoría.
 * @returns El objeto de la categoría recién creada.
 */
export async function addCategory(db: Db, name: string): Promise<Category> {
    const newCategory = await db.query(
        "INSERT INTO Categories (name) VALUES ($1) RETURNING *",
        [name.trim()]
    );
    return newCategory.rows[0];
}

/**
 * Elimina una categoría por su ID.
 * @param db Pool de conexión a la base de datos.
 * @param categoryId El ID de la categoría a eliminar.
 * @returns El número de filas eliminadas (0 o 1).
 */
export async function deleteCategoryById(db: Db, categoryId: number): Promise<number> {
    const result = await db.query("DELETE FROM Categories WHERE category_id = $1", [categoryId]);
    return result.rowCount;
}

/**
 * Verifica si una categoría tiene productos asociados.
 * @param db Pool de conexión a la base de datos.
 * @param categoryId El ID de la categoría a verificar.
 * @returns `true` si tiene productos, `false` en caso contrario.
 */
export async function categoryHasProducts(db: Db, categoryId: number): Promise<boolean> {
    const result = await db.query(
        "SELECT COUNT(*) FROM Products WHERE category_id = $1",
        [categoryId]
    );
    return parseInt(result.rows[0].count, 10) > 0;
}

/**
 * Busca una categoría por su nombre.
 * @param db Pool de conexión a la base de datos.
 * @param categoryName El nombre de la categoría a buscar.
 * @returns El objeto Category si se encuentra, null si no existe.
 */
export async function getCategoryByName(db: Db, categoryName: string): Promise<Category | null> {
    const result = await db.query(
        "SELECT * FROM Categories WHERE LOWER(name) = LOWER($1)",
        [categoryName.trim()]
    );
    return result.rows[0] || null;
}