// Plain CSS, no PostCSS plugins. This file also stops PostCSS from picking up the main site's Tailwind config at the
// repository root, whose packages are not installed when only commerce/ is deployed (Hostinger).
export default {plugins: {}};
