import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const bodies = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/bodies" }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    type: z.enum(["star", "planet", "moon", "asteroid", "comet", "spacecraft"]),
    summary: z.string(),
    hero_scene: z.string().optional(),
  }),
});

const lessons = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/lessons" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    summary: z.string(),
    bodies: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    hero_scene: z.string().optional(),
    reading_time: z.number().int().positive(),
    published: z.date(),
  }),
});

const missions = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/missions" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    summary: z.string(),
    bodies: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    hero_scene: z.string().optional(),
    date_event: z.date(),
    agency: z.string().optional(),
    reading_time: z.number().int().positive(),
    published: z.date(),
  }),
});

const topics = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/topics" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    summary: z.string(),
    hero_scene: z.string().optional(),
    reading_time: z.number().int().positive(),
    published: z.date(),
  }),
});

export const collections = { bodies, lessons, missions, topics };
