import { Teacher } from './types';

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: '1',
    name: 'Ahmet',
    surname: 'Yılmaz',
    branch: 'Matematik',
    address: 'Kepez / Antalya',
    phone: '0555 123 4567',
    duty: 'Pazartesi - Bahçe',
    role: 'Öğretmen',
    lessons: [{ id: 'lesson1', day: 'Pazartesi', time: '09:00', className: '10-A', branch: 'Matematik' }]
  },
  {
    id: '2',
    name: 'Ayşe',
    surname: 'Demir',
    branch: 'Fizik',
    address: 'Varsak / Antalya',
    phone: '0532 987 6543',
    duty: 'Çarşamba - Zemin Kat',
    role: 'Öğretmen',
    lessons: []
  }
];