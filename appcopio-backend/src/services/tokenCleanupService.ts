// src/services/tokenCleanupService.ts
import pool from "../config/db";

/**
 * Limpia tokens expirados y revocados de la base de datos
 * Se recomienda ejecutar periódicamente (ej: cada hora o diariamente)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    // console.log('[TokenCleanup] 🧹 Iniciando limpieza de tokens expirados...');
    
    const result = await pool.query(`
      DELETE FROM RefreshTokens
      WHERE 
        -- Tokens que ya expiraron hace más de 1 día
        (expires_at < NOW() - INTERVAL '1 day')
        OR
        -- Tokens revocados hace más de 7 días
        (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days')
    `);
    
    const deletedCount = result.rowCount || 0;
    
    if (deletedCount > 0) {
      // console.log(`[TokenCleanup] ✅ Eliminados ${deletedCount} tokens obsoletos`);
    } else {
      // console.log('[TokenCleanup] ℹ️ No hay tokens para limpiar');
    }
    
  } catch (error) {
    console.error('[TokenCleanup] ❌ Error al limpiar tokens:', error);
  }
}

/**
 * Inicia la limpieza automática periódica de tokens
 * @param intervalHours - Intervalo en horas entre limpiezas (default: 6 horas)
 */
export function startTokenCleanupScheduler(intervalHours: number = 6): NodeJS.Timeout {
  // console.log(`[TokenCleanup] 🕐 Programando limpieza automática cada ${intervalHours} horas`);
  
  // Ejecutar inmediatamente al iniciar
  cleanupExpiredTokens();
  
  // Programar ejecuciones periódicas
  const intervalMs = intervalHours * 60 * 60 * 1000;
  return setInterval(cleanupExpiredTokens, intervalMs);
}

/**
 * Revoca todos los tokens de un usuario específico
 * Útil para forzar cierre de sesión en todos los dispositivos
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  try {
    // console.log(`[TokenCleanup] 🔒 Revocando todos los tokens del usuario ${userId}...`);
    
    const result = await pool.query(
      `UPDATE RefreshTokens 
       SET revoked_at = NOW() 
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    
    const revokedCount = result.rowCount || 0;
    // console.log(`[TokenCleanup] ✅ Revocados ${revokedCount} tokens del usuario ${userId}`);
    
  } catch (error) {
    console.error(`[TokenCleanup] ❌ Error al revocar tokens del usuario ${userId}:`, error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de tokens en la base de datos
 */
export async function getTokenStats(): Promise<{
  total: number;
  active: number;
  expired: number;
  revoked: number;
}> {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE expires_at > NOW() AND revoked_at IS NULL) as active,
        COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired,
        COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked
      FROM RefreshTokens
    `);
    
    return {
      total: parseInt(result.rows[0].total),
      active: parseInt(result.rows[0].active),
      expired: parseInt(result.rows[0].expired),
      revoked: parseInt(result.rows[0].revoked)
    };
  } catch (error) {
    console.error('[TokenCleanup] ❌ Error al obtener estadísticas:', error);
    return { total: 0, active: 0, expired: 0, revoked: 0 };
  }
}
