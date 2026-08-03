import { Router } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId, requireRole } from '../middleware/auth.js';
import { serializeTrainingTemplate } from '../serialize.js';
import { getAnthropic } from '../anthropic.js';

export const trainingTemplatesRouter = Router();

const templateSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  location: z.string().optional().default(''),
  startTime: z.string().optional().default(''),
  endTime: z.string().optional().default(''),
  capacity: z.number().int().min(1).nullable().optional(),
  defaultPlan: z.string().optional().default(''),
});

trainingTemplatesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const items = await prisma.trainingTemplate.findMany({
      where: { clubId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(items.map(serializeTrainingTemplate));
  }),
);

trainingTemplatesRouter.post(
  '/',
  requireRole('admin', 'coach', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const data = templateSchema.parse(req.body);
    const created = await prisma.trainingTemplate.create({
      data: {
        clubId,
        name: data.name,
        title: data.title || null,
        description: data.description || null,
        location: data.location || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        capacity: data.capacity ?? null,
        defaultPlan: data.defaultPlan || null,
      },
    });
    res.status(201).json(serializeTrainingTemplate(created));
  }),
);

trainingTemplatesRouter.patch(
  '/:id',
  requireRole('admin', 'coach', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.trainingTemplate.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Treniruotės planas nerastas.');
    const data = templateSchema.partial().parse(req.body);
    const updated = await prisma.trainingTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.title !== undefined ? { title: data.title || null } : {}),
        ...(data.description !== undefined
          ? { description: data.description || null }
          : {}),
        ...(data.location !== undefined
          ? { location: data.location || null }
          : {}),
        ...(data.startTime !== undefined
          ? { startTime: data.startTime || null }
          : {}),
        ...(data.endTime !== undefined
          ? { endTime: data.endTime || null }
          : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity ?? null } : {}),
        ...(data.defaultPlan !== undefined
          ? { defaultPlan: data.defaultPlan || null }
          : {}),
      },
    });
    res.json(serializeTrainingTemplate(updated));
  }),
);

const generateSchema = z.object({
  prompt: z.string().min(3).max(2000),
});

// AI-assisted template generation. The coach describes a training in plain
// Lithuanian and Claude fills in the template fields via tool use (schema-
// constrained JSON). The returned payload is not persisted — the FE previews
// it and the user saves via POST /training-templates like any other template.
trainingTemplatesRouter.post(
  '/generate',
  requireRole('admin', 'coach', 'super_admin'),
  asyncHandler(async (req, res) => {
    requireClubId(req);
    const { prompt } = generateSchema.parse(req.body);

    let anthropic;
    try {
      anthropic = getAnthropic();
    } catch (err) {
      throw new HttpError(503, err instanceof Error ? err.message : 'AI nepasiekiamas.');
    }

    const templateTool = {
      name: 'save_training_template',
      description:
        'Grąžina sugeneruotą treniruotės plano šabloną vieno klubo trenerio naudojimui.',
      input_schema: {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string',
            description:
              'Trumpas plano pavadinimas, pagal kurį treneris atpažins šabloną sąraše (pvz. „Sprinto technika — pagrindinė“).',
          },
          title: {
            type: 'string',
            description: 'Treniruotės pavadinimas, kurį matys nariai.',
          },
          description: {
            type: 'string',
            description: 'Kelių sakinių aprašymas, ką nariai darys.',
          },
          location: {
            type: 'string',
            description:
              'Tipinė treniruotės vieta (jei aišku iš konteksto — kitaip palikti tuščią).',
          },
          startTime: {
            type: 'string',
            description: 'Pradžios laikas formatu HH:MM, pvz. „18:30“.',
          },
          endTime: {
            type: 'string',
            description: 'Pabaigos laikas formatu HH:MM, pvz. „19:45“.',
          },
          capacity: {
            type: 'integer',
            minimum: 1,
            description: 'Rekomenduojamas maksimalus dalyvių skaičius.',
          },
          defaultPlan: {
            type: 'string',
            description:
              'Detalus treniruotės planas su skyriais: apšilimas, pagrindinė dalis, atsipalaidavimas, pastabos. Naudokite eilučių pertraukas ir aiškų struktūrizavimą.',
          },
        },
        required: [
          'name',
          'title',
          'description',
          'startTime',
          'endTime',
          'capacity',
          'defaultPlan',
        ],
      },
    };

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      tools: [templateTool],
      tool_choice: { type: 'tool', name: templateTool.name },
      system:
        'Esate lengvosios atletikos ir bendrosios fizinės parengties treneris. Kurdami treniruotės planą lietuvių kalba, būkite konkretūs: apšilimas, pagrindinė dalis su serijomis/pratimais/intensyvumu/pauzėmis, atsipalaidavimas ir pastabos. Rašykite trumpai ir dalykiškai.',
      messages: [{ role: 'user', content: prompt }],
    });

    const toolUse = message.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    if (!toolUse) {
      throw new HttpError(502, 'AI negrąžino tinkamo atsakymo. Bandykite dar kartą.');
    }

    const input = toolUse.input as Record<string, unknown>;
    res.json({
      name: String(input.name ?? ''),
      title: String(input.title ?? ''),
      description: String(input.description ?? ''),
      location: String(input.location ?? ''),
      startTime: String(input.startTime ?? ''),
      endTime: String(input.endTime ?? ''),
      capacity:
        typeof input.capacity === 'number' && input.capacity > 0
          ? Math.round(input.capacity)
          : null,
      defaultPlan: String(input.defaultPlan ?? ''),
    });
  }),
);

trainingTemplatesRouter.delete(
  '/:id',
  requireRole('admin', 'coach', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.trainingTemplate.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Treniruotės planas nerastas.');
    await prisma.trainingTemplate.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
