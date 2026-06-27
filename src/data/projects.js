// Site content is stored in content.json so it can be edited via the admin panel (CMS).
// projects.js just exposes it to the pages. cover = the first image of each project.
import content from './content.json';

export const projects = content.projects.map((p) => ({ ...p, cover: p.images[0] }));
export const heroImages = content.heroImages;
export const testimonials = content.testimonials;
