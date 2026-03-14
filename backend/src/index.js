const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const Clinica = require('./models/Clinica');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

const usuarioRoutes = require('./routes/usuarioRoutes');
app.use('/api/usuarios', usuarioRoutes);

const propietarioRoutes = require('./routes/propietarioRoutes');
const mascotaRoutes = require('./routes/mascotaRoutes');
app.use('/api/propietarios', propietarioRoutes);
app.use('/api/mascotas', mascotaRoutes);

const citaRoutes = require('./routes/citaRoutes');
app.use('/api/citas', citaRoutes);

const historiaClinicaRoutes = require('./routes/historiaClinicaRoutes');
app.use('/api/historias', historiaClinicaRoutes);

const inventarioRoutes = require('./routes/inventarioRoutes');
app.use('/api/inventario', inventarioRoutes);

const facturaRoutes = require('./routes/facturaRoutes');
app.use('/api/facturas', facturaRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a VetNova API' });
});

const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => {
    console.log('Conexion a la base de datos exitosa');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('Tablas sincronizadas');
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error conectando a la base de datos:', error);
  });