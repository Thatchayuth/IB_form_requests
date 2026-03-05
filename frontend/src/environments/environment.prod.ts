/**
 * Environment — Production
 * ตั้งค่าสำหรับ production (เปลี่ยน apiUrl ตามจริง)
 */
export const environment = {
  production: true,
  apiUrl: '/api',  // Proxy ผ่าน reverse proxy (Nginx / IIS)
};
