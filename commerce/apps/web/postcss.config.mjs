// Tailwind 4 for the back office's shadcn/ui components (src/app/admin/shadcn.css). This file also stops PostCSS from
// picking up the main site's config at the repository root, whose packages are not installed when only commerce/ is
// deployed (Hostinger). Plain CSS files pass through unchanged.
export default {plugins: {'@tailwindcss/postcss': {}}};
