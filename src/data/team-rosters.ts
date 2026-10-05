type StaffMember = { name: string; role?: string };
export type TeamRoster = { goalkeepers?: string[]; players?: string[]; staff: StaffMember[]; school?: boolean };

// Names and roles supplied by the club. The reserve-team poster does not
// specify player positions, so its abbreviations are preserved as provided.
const school: TeamRoster = {
  school: true,
  staff: [
    { name: 'Ana Jiménez', role: 'Coordinadora' },
    { name: 'Iván Priego', role: 'Monitor' },
    { name: 'Jesús Cubero', role: 'Monitor' },
    { name: 'Sergio Montes', role: 'Monitor' },
  ],
};

export const teamRosters: Record<string, TeamRoster> = {
  infantil: {
    goalkeepers: ['Luis Jiménez', 'Antonio Cantero'],
    players: ['Adrián Jiménez', 'Javier Navarro', 'Natalia Ruiz', 'Alberto Lama', 'Álvaro Camacho', 'Ángela Jiménez', 'Yago Bravo', 'Álvaro Bonilla', 'Alejandro Almansa'],
    staff: [{ name: 'Adri Luna' }, { name: 'Víctor Jiménez' }, { name: 'Bea Luna' }],
  },
  cadete: {
    goalkeepers: ['Pablo Gómez', 'Ismael Montilla', 'Daniel Toro'],
    players: ['Daniel Moreno', 'Sergio Montes', 'Sofía Cortés', 'Adam Aboulalam', 'Rodrigo de la Torre', 'Sergio Écija', 'Juanjo Gordillo', 'José A. Jiménez', 'Marcos Jurado', 'Adrián Marín', 'Álvaro Montes', 'Luis Priego', 'Rafa Vera'],
    staff: [{ name: 'Francisco Javier Rueda' }, { name: 'Julio Lozano' }],
  },
  filial: {
    players: ['Rosales', 'David C.', 'Ruz', 'Raúl C.', 'Iván P.', 'Rubio', 'Víctor', 'Félix', 'Carlos', 'D. Gómez', 'Diego', 'Pedrito', 'Manu Lama', 'R. Bonilla', 'Gosé M.'],
    staff: [{ name: 'Julio Lozano', role: 'Entrenador' }, { name: 'Chiqui Rueda', role: 'Delegado' }, { name: 'Alejandro Cubero', role: 'Preparador físico' }],
  },
  'escuela-alevin': school,
  'escuela-benjamin': school,
  'escuela-biberon': school,
};
