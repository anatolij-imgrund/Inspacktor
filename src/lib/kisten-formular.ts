import { z } from 'zod';

export const kistenFormularSchema = z.object({
  titel: z
    .string()
    .trim()
    .min(1, 'Bitte gib der Kiste einen Titel.')
    .max(80, 'Der Titel darf höchstens 80 Zeichen lang sein.'),
  standort: z.string().trim().max(60, 'Der Standort darf höchstens 60 Zeichen lang sein.'),
  beschreibung: z.string().trim().max(2000, 'Die Beschreibung darf höchstens 2000 Zeichen lang sein.'),
});

export type KistenFormularEingabe = z.input<typeof kistenFormularSchema>;
export type KistenFormularWerte = z.output<typeof kistenFormularSchema>;

export const LEERES_FORMULAR: KistenFormularEingabe = { titel: '', standort: '', beschreibung: '' };

export const MAX_MENGE = 999;

export const gegenstandFormularSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Bitte gib dem Gegenstand einen Namen.')
    .max(80, 'Der Name darf höchstens 80 Zeichen lang sein.'),
  beschreibung: z.string().trim().max(1000, 'Die Beschreibung darf höchstens 1000 Zeichen lang sein.'),
  menge: z
    .number()
    .int('Bitte eine ganze Zahl eingeben.')
    .min(1, 'Die Menge muss mindestens 1 sein.')
    .max(MAX_MENGE, `Die Menge darf höchstens ${MAX_MENGE} sein.`),
});

export type GegenstandFormularEingabe = z.input<typeof gegenstandFormularSchema>;
export type GegenstandFormularWerte = z.output<typeof gegenstandFormularSchema>;

export const LEERER_GEGENSTAND: GegenstandFormularEingabe = { name: '', beschreibung: '', menge: 1 };
