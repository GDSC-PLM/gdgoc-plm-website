type PageTemplateProps = {
  title: string;
  description: string;
};

export function PageTemplate({ title, description }: PageTemplateProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium">GDGoC PLM</p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </section>
  );
}
