// src/declarations.d.ts
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// Para CSS modules (si los usas)
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}