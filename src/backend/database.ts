import sql from 'mssql';

const config = {
  user: 'sa',
  password: 'Cilincagrupo3#',
  server: process.env.DB_HOST || 'localhost',
  database: 'ClinicaDB',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

export async function connectToDatabase() {
  try {
    const pool = await sql.connect(config);
    console.log('✅ Conectado a ClinicaDB');
    return pool;
  } catch (err) {
    console.error('❌ Error conectando a la base de datos:', err);
    throw err;
  }
}

// Función para probar la conexión
export async function testConnection() {
  try {
    const pool = await connectToDatabase();
    const result = await pool.request().query('SELECT DB_NAME() as database_name');
    console.log(`📊 Conectado a: ${result.recordset[0].database_name}`);
    return true;
  } catch (error) {
    console.error('Error de conexión:', error);
    return false;
  }
}