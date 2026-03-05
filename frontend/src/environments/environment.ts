/**
 * Environment — Development
 * ตั้งค่าสำหรับ dev (localhost)
 */
export const environment = {
  production: false,
  apiUrl: '/api',  // ใช้ relative path — proxy จะ forward ไป http://localhost:3000
};
