---
name: new-component
description: Create a new React component following admin patterns
---
Create a new React component: $ARGUMENTS

1. Identify which admin section this belongs to (imoveis, contatos, negocios, documentos, site)
2. Read existing components in that section's `_components/` folder for patterns
3. Read shared components in `app/admin/_components/` (AdminShell, SubNav, CentralPage, etc.)
4. Create the component following existing conventions:
   - PascalCase for component names
   - kebab-case for file names
   - TypeScript strict, no `any`
   - Props interface defined and exported
   - Use existing shared components where possible (SubNav, PlaceholderLens, etc.)
5. If the component needs data, use the existing `lib/api-client.ts` pattern
6. Add to the appropriate page or layout
7. Test with `npm run build` (catches type errors) and `npm run lint`
