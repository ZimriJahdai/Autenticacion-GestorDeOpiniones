import { User } from '../src/users/user.model.js';
import { Role, UserRole } from '../src/auth/role.model.js';
import { ADMIN_ROLE } from './role-constants.js';
import { createNewUser } from './user-db.js';
import { setUserSingleRole } from './role-db.js';
import { sequelize } from '../configs/db.js';

/**
 * Crea un usuario administrador por defecto si no existe
 * Credenciales por defecto:
 * - Email: admin@gestordeopiniones.com
 * - Password: Admin123!
 */
export const seedAdminUser = async () => {
  const adminEmail = 'admin@gestordeopiniones.com';
  const adminPassword = 'Admin123!';

  try {
    // Verificar si ya existe un admin
    const existingAdmin = await User.findOne({
      where: { Email: adminEmail },
    });

    if (existingAdmin) {
      console.log('✓ Usuario administrador ya existe');
      return;
    }

    // Crear el usuario admin usando la función existente
    const adminUser = await createNewUser({
      name: 'Admin',
      surname: 'GestorDeOpiniones',
      username: 'admin',
      email: adminEmail,
      password: adminPassword,
      phone: '99999999',
      profilePicture: null, // Usa el avatar por defecto
    });

    // Actualizar el status a true (cuenta activada)
    await User.update(
      { Status: true },
      { where: { Id: adminUser.Id } }
    );

    // Actualizar email a verificado
    const { markEmailAsVerified } = await import('./user-db.js');
    await markEmailAsVerified(adminUser.Id);

    // Cambiar rol de USER_ROLE a ADMIN_ROLE
    await setUserSingleRole(adminUser, ADMIN_ROLE, sequelize);

    console.log('✓ Usuario administrador creado exitosamente');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('  ⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
  } catch (error) {
    console.error('Error creando usuario administrador:', error);
    throw error;
  }
};
