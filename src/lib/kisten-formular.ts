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
